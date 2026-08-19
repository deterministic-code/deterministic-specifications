import { SpecValidator, type ParsedYaml } from "../SpecValidator.ts";
import type { SpecValidationResult, ValidateOptions } from "../types.ts";
/**
 * Live engine for `datasource_seeds.yaml`: JSON Schema first, then
 * semantic checks against the companion `datasource_types.yaml`.
 * Pinned to {@link LIVE_VERSION}.
 */
export declare class DatasourceSeedsValidator extends SpecValidator {
    constructor();
    protected optionsForFile(path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
    protected check(parsed: ParsedYaml, text: string, options?: ValidateOptions): Promise<SpecValidationResult>;
}
