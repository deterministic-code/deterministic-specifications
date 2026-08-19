import type { ParsedYaml } from "./SpecValidator.ts";
import type { SpecValidationResult, ValidateOptions } from "./types.ts";
export declare function withIncludeFilePath(path: string, options?: ValidateOptions): ValidateOptions;
/**
 * Walk `file:` includes from a datasource_types document and report cycles,
 * missing files, and unreadable / non-mapping targets. Remote includes
 * (`id` / `uuid` / `user_id`+`name`) are skipped — they cannot be followed
 * without a resolver. No-ops when neither `includeFilePath` nor
 * `includeBasePath` is set (in-memory `validate()` stays schema-only).
 */
export declare function checkIncludeCycles(parsed: ParsedYaml, options?: ValidateOptions): Promise<SpecValidationResult>;
