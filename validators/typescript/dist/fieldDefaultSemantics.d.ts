import { type ParsedYaml } from "./SpecValidator.ts";
import type { SpecValidationResult } from "./types.ts";
import { type FieldType } from "./fieldTypeCatalog.ts";
export declare function checkFieldDefaults(parsed: ParsedYaml, catalog: Map<string, FieldType>): SpecValidationResult;
export declare function checkFieldDefaultSemantics(parsed: ParsedYaml): Promise<SpecValidationResult>;
