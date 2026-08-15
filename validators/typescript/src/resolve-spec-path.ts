import { access } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

async function fileExists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

/**
 * Locate a bundled spec YAML by walking ancestor directories of THIS module
 * for the first `<ancestor>/<subdir>/<name>` that exists, or null when none
 * carries it. This resolves both the in-repo layout (specs at the repository
 * root's `backend/`/`frontend/`) and the published layout (specs copied beside
 * the package).
 */
export async function findSpecPath(
  subdir: string,
  name: string,
): Promise<string | null> {
  const start = dirname(fileURLToPath(import.meta.url));
  const { root } = parse(start);
  let current = start;
  for (;;) {
    const candidate = join(current, subdir, name);
    if (await fileExists(candidate)) return candidate;
    if (current === root) return null;
    current = dirname(current);
  }
}

/** {@link findSpecPath}, but throws when the spec cannot be located rather than returning a path that later fails to read. */
export async function resolveSpecPath(
  subdir: string,
  name: string,
): Promise<string> {
  const found = await findSpecPath(subdir, name);
  if (found === null) {
    throw new Error(`spec file not found: ${subdir}/${name}`);
  }
  return found;
}
