import { SpecValidator, type ParsedYaml } from "../SpecValidator.ts";
import type { SpecValidationResult, ValidateOptions } from "../types.ts";
/**
 * Live engine for the routes-api IR: JSON Schema first, then unique
 * route names. Pinned to {@link LIVE_VERSION}.
 */
export declare class RoutesApiValidator extends SpecValidator {
    constructor();
    protected check(parsed: ParsedYaml, text: string, options?: ValidateOptions): Promise<SpecValidationResult>;
}
