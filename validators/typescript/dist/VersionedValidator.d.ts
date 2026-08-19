import { FileValidator, type ParsedYaml } from "./SpecValidator.ts";
import type { SpecValidationResult, ValidateOptions } from "./types.ts";
type Engine = {
    validate(text: string, options?: ValidateOptions): Promise<SpecValidationResult>;
};
export declare function engineConstructor(mod: Record<string, unknown>, exportName: string): new () => Engine;
/**
 * Public facade: read `version` from the document (required semver), load
 * that version's engine (`src/validators/` for the live version, or
 * `versions/<semver>/validators/`), and delegate. Missing or unknown
 * versions fail before an engine is constructed.
 */
export declare class VersionedValidator extends FileValidator {
    #private;
    constructor(exportName: string);
    protected check({ doc, lineCounter, data }: ParsedYaml, text: string, options?: ValidateOptions): Promise<SpecValidationResult>;
}
export declare class DatasourceTypesValidator extends VersionedValidator {
    constructor();
    protected optionsForFile(path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
}
export declare class ViewTypesValidator extends VersionedValidator {
    constructor();
    protected optionsForFile(path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
}
export declare class RoutesValidator extends VersionedValidator {
    constructor();
    protected optionsForFile(path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
}
export declare class RoutesApiValidator extends VersionedValidator {
    constructor();
}
export declare class ServicesValidator extends VersionedValidator {
    constructor();
    protected optionsForFile(path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
}
export declare class FrontendBindingsValidator extends VersionedValidator {
    constructor();
}
export declare class DatasourceSeedsValidator extends VersionedValidator {
    constructor();
    protected optionsForFile(path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
}
export {};
