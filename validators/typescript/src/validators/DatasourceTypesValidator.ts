import { SpecValidator, type ParsedYaml } from "../SpecValidator.ts";
import { LIVE_VERSION } from "../specVersion.ts";
import type { SpecValidationResult, ValidateOptions } from "../types.ts";
import { checkFieldDefaultSemantics } from "../fieldDefaultSemantics.ts";
import {
  checkIncludeCycles,
  withIncludeFilePath,
} from "../includeSemantics.ts";

/**
 * Live engine for `datasource_types.yaml`: JSON Schema first, then
 * default_value tokens/ranges from `backend/types.yaml`, then a walk of
 * `file:` includes that rejects cycles, missing files, and unreadable
 * targets. Pinned to {@link LIVE_VERSION}.
 */
export class DatasourceTypesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "datasource-types.spec.yaml",
      version: LIVE_VERSION,
    });
  }

  protected async optionsForFile(
    path: string,
    options?: ValidateOptions,
  ): Promise<ValidateOptions | undefined> {
    return withIncludeFilePath(path, options);
  }

  protected async check(
    parsed: ParsedYaml,
    text: string,
    options?: ValidateOptions,
  ): Promise<SpecValidationResult> {
    const schema = await super.check(parsed, text, options);
    if (!schema.valid) return schema;
    const defaults = await checkFieldDefaultSemantics(parsed);
    if (!defaults.valid) return defaults;
    return checkIncludeCycles(parsed, options);
  }
}
