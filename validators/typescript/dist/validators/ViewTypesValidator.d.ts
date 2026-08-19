import { SpecValidator, type ParsedYaml } from "../SpecValidator.ts";
import type { SpecValidationResult, ValidateOptions } from "../types.ts";
/**
 * Live engine for `view_types.yaml`: JSON Schema first, then unique view
 * names, then a walk of `file:` includes. Pinned to {@link LIVE_VERSION}.
 */
export declare class ViewTypesValidator extends SpecValidator {
    constructor();
    protected optionsForFile(path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
    protected check(parsed: ParsedYaml, text: string, options?: ValidateOptions): Promise<SpecValidationResult>;
}
