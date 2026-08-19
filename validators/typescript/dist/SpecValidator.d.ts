import type { AjvError, AjvLike, SpecValidationResult, ValidateOptions } from "./types.ts";
import { parseYamlWithPositions } from "./yamlPositions.ts";
import { type EngineName, type SpecRef } from "./specVersion.ts";
type SpecPathFn = () => Promise<string>;
type SpecPathSource = string | SpecPathFn | SpecRef;
type AjvCtorType = new (opts: unknown) => AjvLike;
type YamlDoc = ReturnType<typeof parseYamlWithPositions>["doc"];
type YamlLines = ReturnType<typeof parseYamlWithPositions>["lineCounter"];
export type ParsedYaml = {
    doc: YamlDoc;
    lineCounter: YamlLines;
    data: unknown;
};
export declare function yamlErrorOffset(pos: readonly number[] | undefined | null): number;
export declare function versionFail(doc: YamlDoc, lineCounter: YamlLines, message: string): SpecValidationResult;
/** CJS/ESM interop: `ajv/dist/2020.js` may be the class or `{ default: class }`. */
export declare function resolveAjvCtor(mod: unknown): AjvCtorType;
export declare function formatAjvError(e: AjvError): string;
export declare function errorFromUnknown(err: unknown): string;
/**
 * Shared parse + file entry: YAML syntax errors are mapped here; subclasses
 * implement {@link check} against the parsed document.
 */
export declare abstract class FileValidator {
    validate(text: string, options?: ValidateOptions): Promise<SpecValidationResult>;
    protected abstract check(parsed: ParsedYaml, text: string, options?: ValidateOptions): Promise<SpecValidationResult>;
    protected optionsForFile(_path: string, options?: ValidateOptions): Promise<ValidateOptions | undefined>;
    validateFile(path: string, options?: ValidateOptions): Promise<SpecValidationResult>;
}
/**
 * Validates a `deterministic/*.yaml` document against one strict JSON Schema
 * (draft 2020-12, authored in YAML). The base class carries AJV compilation
 * and source-position mapping so every error reports `{ line, col }`.
 *
 * Pass a `{ subdir, name, version }` ref to pin this engine to one contract
 * version. The document's `version` must match; the matching snapshot is
 * loaded and nothing else. Pass an absolute path (or path thunk) to validate
 * against a spec that lives outside this package — the pin check is skipped.
 */
export declare class SpecValidator extends FileValidator {
    #private;
    constructor(specPath: SpecPathSource);
    protected check({ doc, lineCounter, data }: ParsedYaml, _text: string, _options?: ValidateOptions): Promise<SpecValidationResult>;
    static pinned(ref: SpecRef): new () => SpecValidator;
    static pinnedEngines(version: string): Record<EngineName, new () => SpecValidator>;
}
export {};
