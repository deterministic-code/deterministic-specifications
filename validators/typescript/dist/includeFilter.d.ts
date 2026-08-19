import type { SpecValidationResult } from "./types.ts";
import type { ParsedYaml } from "./SpecValidator.ts";
export type FilterParseResult = {
    ok: true;
} | {
    ok: false;
    message: string;
};
export declare function parseIncludeFilter(expr: string): FilterParseResult;
export declare function checkIncludeFilters(parsed: ParsedYaml): SpecValidationResult;
