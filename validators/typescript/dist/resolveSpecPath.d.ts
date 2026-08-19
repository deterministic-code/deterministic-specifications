/**
 * Walk ancestor directories of `start` (default: this module) for the first
 * `<ancestor>/<relPath>` that exists.
 */
export declare function findAncestorPath(relPath: string, start?: string): Promise<string | null>;
export declare function specRelPath(subdir: string, name: string, version: string): string;
/**
 * Locate a bundled spec YAML by walking ancestor directories of THIS module
 * for the first match. The live version resolves to the root
 * `<ancestor>/<subdir>/<name>` (falling back to `versions/<semver>/` if the
 * live tree is gone). Any other semver resolves to
 * `<ancestor>/versions/<semver>/<subdir>/<name>`.
 */
export declare function findSpecPath(subdir: string, name: string, version: string, start?: string): Promise<string | null>;
export declare function listPublishedVersions(start?: string): Promise<string[]>;
export declare function listSpecVersions(start?: string): Promise<string[]>;
export declare function resolveSpecPath(subdir: string, name: string, version: string, start?: string): Promise<string>;
export declare function engineRelPath(version: string): string;
export declare function findEngineDir(version: string, start?: string): Promise<string | null>;
export declare function resolveEngineDir(version: string, start?: string): Promise<string>;
