import { SpecValidator, type ParsedYaml } from "../SpecValidator.ts";
import { CURRENT_VERSION } from "../specVersion.ts";
import type { SpecValidationResult, ValidateOptions } from "../types.ts";
import {
  checkIncludeCycles,
  withIncludeFilePath,
} from "../includeSemantics.ts";

/**
 * CURRENT engine for `datasource_types.yaml`: JSON Schema first, then a
 * walk of `file:` includes that rejects cycles, missing files, and
 * unreadable targets.
 */
export class DatasourceTypesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "datasource-types.spec.yaml",
      version: CURRENT_VERSION,
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
    return checkIncludeCycles(parsed, options);
  }
}
