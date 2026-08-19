import { SpecValidator, type ParsedYaml } from "../SpecValidator.ts";
import type { SpecValidationResult, ValidateOptions } from "../types.ts";
/**
 * Live engine for `routes.yaml`: JSON Schema first, then unique route names
 * and exclusive custom-route dispatch, then a walk of `file:` includes.
 * Pinned to {@link LIVE_VERSION}.
 */
export declare class RoutesValidator extends SpecValidator {
    constructor();
    protected optionsForFile(path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
    protected check(parsed: ParsedYaml, text: string, options?: ValidateOptions): Promise<SpecValidationResult>;
}
