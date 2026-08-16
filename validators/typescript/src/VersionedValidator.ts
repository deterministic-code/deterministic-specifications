import { pathToFileURL } from "node:url";
import { join } from "node:path";
import {
  mapEngines,
  parseSpecVersion,
  VALIDATOR_ENGINE_FILE,
} from "./specVersion.ts";
import { resolveEngineDir } from "./resolveSpecPath.ts";
import {
  errorFromUnknown,
  FileValidator,
  versionFail,
  type ParsedYaml,
} from "./SpecValidator.ts";
import type { SpecValidationResult, ValidateOptions } from "./types.ts";
import { withSiblingDatasourceTypes } from "./seedSemantics.ts";
import { withIncludeFilePath } from "./includeSemantics.ts";

type Engine = {
  validate(
    text: string,
    options?: ValidateOptions,
  ): Promise<SpecValidationResult>;
};

export function engineConstructor(
  mod: Record<string, unknown>,
  exportName: string,
): new () => Engine {
  const Ctor = mod[exportName];
  if (typeof Ctor !== "function") {
    throw new Error(
      `validator engine missing export ${exportName} in ${VALIDATOR_ENGINE_FILE}`,
    );
  }
  return Ctor as new () => Engine;
}

async function loadEngine(exportName: string, version: string): Promise<Engine> {
  const href = pathToFileURL(
    join(await resolveEngineDir(version), VALIDATOR_ENGINE_FILE),
  ).href;
  return new (engineConstructor(
    (await import(href)) as Record<string, unknown>,
    exportName,
  ))();
}

/**
 * Public facade: read `version` from the document, load that archive's
 * engine (`src/validators/` for CURRENT, or `versions/<semver>/validators/`),
 * and delegate. Unknown versions fail before an engine is constructed.
 */
export class VersionedValidator extends FileValidator {
  readonly #exportName: string;

  constructor(exportName: string) {
    super();
    this.#exportName = exportName;
  }

  protected async check(
    { doc, lineCounter, data }: ParsedYaml,
    text: string,
    options?: ValidateOptions,
  ): Promise<SpecValidationResult> {
    const parsed = parseSpecVersion(data);
    if (!parsed.ok) return versionFail(doc, lineCounter, parsed.message);
    try {
      return (await loadEngine(this.#exportName, parsed.version)).validate(
        text,
        options,
      );
    } catch (err) {
      return versionFail(doc, lineCounter, errorFromUnknown(err));
    }
  }
}

const facades = mapEngines(({ className }) =>
  class extends VersionedValidator {
    constructor() {
      super(className);
    }
  },
);

export class DatasourceTypesValidator extends facades.DatasourceTypesValidator {
  protected async optionsForFile(
    path: string,
    options?: ValidateOptions,
  ): Promise<ValidateOptions | undefined> {
    return withIncludeFilePath(path, options);
  }
}

export const ViewTypesValidator = facades.ViewTypesValidator;
export const RoutesValidator = facades.RoutesValidator;
export const ServicesValidator = facades.ServicesValidator;
export const FrontendBindingsValidator = facades.FrontendBindingsValidator;

export class DatasourceSeedsValidator extends facades.DatasourceSeedsValidator {
  protected async optionsForFile(
    path: string,
    options?: ValidateOptions,
  ): Promise<ValidateOptions | undefined> {
    return withSiblingDatasourceTypes(path, options);
  }
}
