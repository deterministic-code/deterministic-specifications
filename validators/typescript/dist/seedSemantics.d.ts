import type { SpecValidationResult, ValidateOptions } from "./types.ts";
import type { ParsedYaml } from "./SpecValidator.ts";
export declare function withSiblingDatasourceTypes(seedsPath: string, options?: ValidateOptions): Promise<ValidateOptions>;
export declare function checkSeedSemantics(parsed: ParsedYaml, typesData: unknown): SpecValidationResult;
export declare function seedsNeedTypes(data: unknown): boolean;
export declare function companionTypesError(parsed: ParsedYaml, message: string): SpecValidationResult;
