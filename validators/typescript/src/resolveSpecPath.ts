import { access, readdir } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CURRENT_VERSION,
  isPublishedVersion,
  VALIDATOR_ENGINE_FILE,
} from "./specVersion.ts";

async function fileExists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

/**
 * Walk ancestor directories of `start` (default: this module) for the first
 * `<ancestor>/<relPath>` that exists.
 */
export async function findAncestorPath(
  relPath: string,
  start?: string,
): Promise<string | null> {
  let current = start ?? dirname(fileURLToPath(import.meta.url));
  const { root } = parse(current);
  for (;;) {
    const candidate = join(current, relPath);
    if (await fileExists(candidate)) return candidate;
    if (current === root) return null;
    current = dirname(current);
  }
}

export function specRelPath(
  subdir: string,
  name: string,
  version: string = CURRENT_VERSION,
): string {
  return version === CURRENT_VERSION
    ? join(subdir, name)
    : join("versions", version, subdir, name);
}

/**
 * Locate a bundled spec YAML by walking ancestor directories of THIS module
 * for the first match. CURRENT resolves to the live root
 * `<ancestor>/<subdir>/<name>`; a published semver resolves to
 * `<ancestor>/versions/<semver>/<subdir>/<name>`.
 */
export async function findSpecPath(
  subdir: string,
  name: string,
  version: string = CURRENT_VERSION,
  start?: string,
): Promise<string | null> {
  return findAncestorPath(specRelPath(subdir, name, version), start);
}

export async function listPublishedVersions(
  start?: string,
): Promise<string[]> {
  const dir = await findAncestorPath("versions", start);
  if (dir === null) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && isPublishedVersion(e.name))
    .map((e) => e.name)
    .sort();
}

export async function listSpecVersions(start?: string): Promise<string[]> {
  return [CURRENT_VERSION, ...(await listPublishedVersions(start))];
}

/** {@link findSpecPath}, but throws when the spec cannot be located rather than returning a path that later fails to read. */
async function assertKnownVersion(
  version: string,
  start?: string,
): Promise<void> {
  if (version === CURRENT_VERSION) return;
  const published = await listPublishedVersions(start);
  if (published.includes(version)) return;
  const hint = published.length ? published.join(", ") : "none";
  throw new Error(`unknown spec version: ${version} (published: ${hint})`);
}

async function resolveExisting(
  found: string | null,
  version: string,
  missing: string,
  start?: string,
): Promise<string> {
  if (found !== null) return found;
  await assertKnownVersion(version, start);
  throw new Error(missing);
}

export async function resolveSpecPath(
  subdir: string,
  name: string,
  version: string = CURRENT_VERSION,
  start?: string,
): Promise<string> {
  return resolveExisting(
    await findSpecPath(subdir, name, version, start),
    version,
    `spec file not found: ${specRelPath(subdir, name, version)}`,
    start,
  );
}

export function engineRelPath(version: string): string {
  return version === CURRENT_VERSION
    ? join("validators", "typescript", "src", "validators")
    : join("versions", version, "validators");
}

const CURRENT_ENGINE_FILE = join("validators", VALIDATOR_ENGINE_FILE);

export async function findEngineDir(
  version: string = CURRENT_VERSION,
  start?: string,
): Promise<string | null> {
  if (version === CURRENT_VERSION) {
    const engineFile = await findAncestorPath(CURRENT_ENGINE_FILE, start);
    if (engineFile !== null) return dirname(engineFile);
  }
  return findAncestorPath(engineRelPath(version), start);
}

export async function resolveEngineDir(
  version: string = CURRENT_VERSION,
  start?: string,
): Promise<string> {
  return resolveExisting(
    await findEngineDir(version, start),
    version,
    `validator engine not found: ${engineRelPath(version)}`,
    start,
  );
}
