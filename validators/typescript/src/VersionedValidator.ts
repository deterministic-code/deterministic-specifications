import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { parseYamlWithPositions, positionFor } from "./yamlPositions.ts";
import { parseSpecVersion } from "./specVersion.ts";
import { resolveEngineDir } from "./resolveSpecPath.ts";
import { yamlErrorOffset, errorFromUnknown } from "./SpecValidator.ts";
import type {
  SpecValidationError,
  SpecValidationResult,
} from "./types.ts";

type Engine = {
  validate(text: string): Promise<SpecValidationResult>;
  validateFile(path: string): Promise<SpecValidationResult>;
};

export function engineConstructor(
  mod: Record<string, unknown>,
  engineFile: string,
): new () => Engine {
  const name = engineFile.replace(/\.ts$/, "");
  const Ctor = mod[name];
  if (typeof Ctor !== "function") {
    throw new Error(`validator engine missing export ${name} in ${engineFile}`);
  }
  return Ctor as new () => Engine;
}

function versionError(
  text: string,
  instancePath: string,
  message: string,
): SpecValidationResult {
  const { doc, lineCounter } = parseYamlWithPositions(text);
  const { line, col } = positionFor(doc, lineCounter, instancePath);
  return {
    valid: false,
    errors: [{ line, col, instancePath, message }],
  };
}

async function loadEngine(
  engineFile: string,
  version: string,
): Promise<Engine> {
  const dir = await resolveEngineDir(version);
  const href = pathToFileURL(join(dir, engineFile)).href;
  const mod = (await import(href)) as Record<string, unknown>;
  return new (engineConstructor(mod, engineFile))();
}

/**
 * Public facade: read `version` from the document, load that archive's
 * engine (this package for CURRENT, or `versions/<semver>/validators/`), and
 * delegate. Unknown versions fail before an engine is constructed.
 */
export class VersionedValidator {
  readonly #engineFile: string;

  constructor(engineFile: string) {
    this.#engineFile = engineFile;
  }

  async validate(text: string): Promise<SpecValidationResult> {
    const { doc, lineCounter } = parseYamlWithPositions(text);
    if (doc.errors.length > 0) {
      const errors = doc.errors.map((e): SpecValidationError => {
        const offset = yamlErrorOffset(e.pos);
        const { line, col } = lineCounter.linePos(offset);
        return { line, col, instancePath: "", message: e.message };
      });
      return { valid: false, errors };
    }
    const parsed = parseSpecVersion(doc.toJS());
    if (!parsed.ok) {
      return versionError(text, "/version", parsed.message);
    }
    try {
      const engine = await loadEngine(this.#engineFile, parsed.version);
      return engine.validate(text);
    } catch (err) {
      const message = errorFromUnknown(err);
      return versionError(text, "/version", message);
    }
  }

  async validateFile(path: string): Promise<SpecValidationResult> {
    const text = await readFile(path, "utf8");
    return this.validate(text);
  }
}

export class DatasourceTypesValidator extends VersionedValidator {
  constructor() {
    super("DatasourceTypesValidator.ts");
  }
}

export class ViewTypesValidator extends VersionedValidator {
  constructor() {
    super("ViewTypesValidator.ts");
  }
}

export class RoutesValidator extends VersionedValidator {
  constructor() {
    super("RoutesValidator.ts");
  }
}

export class ServicesValidator extends VersionedValidator {
  constructor() {
    super("ServicesValidator.ts");
  }
}

export class FrontendBindingsValidator extends VersionedValidator {
  constructor() {
    super("FrontendBindingsValidator.ts");
  }
}
