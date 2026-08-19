/** Live unpublished contract at the repo root. Documents must pin this exact semver. */
export declare const LIVE_VERSION = "1.0.0";
export declare const VALIDATOR_ENGINES: readonly [readonly ["DatasourceTypesValidator", "backend", "datasource-types.spec.yaml"], readonly ["DatasourceSeedsValidator", "backend", "datasource-seeds.spec.yaml"], readonly ["ViewTypesValidator", "backend", "view-types.spec.yaml"], readonly ["RoutesValidator", "backend", "routes.spec.yaml"], readonly ["RoutesApiValidator", "backend", "routes-api.spec.yaml"], readonly ["ServicesValidator", "backend", "services.spec.yaml"], readonly ["FrontendBindingsValidator", "frontend", "bindings.spec.yaml"]];
export type EngineName = (typeof VALIDATOR_ENGINES)[number][0];
export type EngineDef = {
    className: EngineName;
    subdir: string;
    name: string;
};
export declare function mapEngines<T>(fn: (engine: EngineDef) => T): Record<EngineName, T>;
export declare const SPEC_FILES: {
    subdir: string;
    name: string;
}[];
export declare const VALIDATOR_ENGINE_FILE = "engines.ts";
export type SpecRef = {
    subdir: string;
    name: string;
    version: string;
};
export type ParseSpecVersionResult = {
    ok: true;
    version: string;
} | {
    ok: false;
    message: string;
};
export declare function isPublishedVersion(value: string): boolean;
export declare function isSpecVersion(value: string): boolean;
export declare function isLiveVersion(value: string): boolean;
export declare function isSpecRef(value: unknown): value is SpecRef;
export declare function parseSpecVersion(data: unknown): ParseSpecVersionResult;
