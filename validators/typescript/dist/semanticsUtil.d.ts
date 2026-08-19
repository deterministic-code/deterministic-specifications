import type { SpecValidationError } from "./types.ts";
import type { ParsedYaml } from "./SpecValidator.ts";
export declare function specErr(parsed: ParsedYaml, instancePath: string, message: string): SpecValidationError;
export declare function singleKey(value: unknown): {
    key: string;
    body: unknown;
} | null;
export declare function pushUnique(seen: Set<string>, name: string, errors: SpecValidationError[], parsed: ParsedYaml, instancePath: string, message: string): boolean;
