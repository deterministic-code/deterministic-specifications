import { SpecValidator, type ParsedYaml } from "../SpecValidator.ts";
import type { SpecValidationResult, ValidateOptions } from "../types.ts";
/**
 * Live engine for `datasource_types.yaml`: JSON Schema first, then
 * default_value tokens/ranges from `backend/types.yaml`, then uniqueness /
 * primary_key / references / index / decimal checks, then a walk of
 * `file:` includes that rejects cycles, missing files, and unreadable
 * targets. Pinned to {@link LIVE_VERSION}.
 */
export declare class DatasourceTypesValidator extends SpecValidator {
    constructor();
    protected optionsForFile(path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
    protected check(parsed: ParsedYaml, text: string, options?: ValidateOptions): Promise<SpecValidationResult>;
}
