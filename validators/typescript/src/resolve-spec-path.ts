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
 * for the first `<ancestor>/<subdir>/<name>` that exists. This resolves both
 * the in-repo layout (specs at the repository root's `backend/`/`frontend/`)
 * and the published layout (specs copied beside the package). Throws when no
 * ancestor carries the file rather than returning a path that later fails to
 * read.
 */
export async function resolveSpecPath(
  subdir: string,
  name: string,
): Promise<string> {
  const start = dirname(fileURLToPath(import.meta.url));
  const { root } = parse(start);
  let current = start;
  const tried: string[] = [];
  for (;;) {
    const candidate = join(current, subdir, name);
    if (await fileExists(candidate)) return candidate;
    tried.push(candidate);
    if (current === root) break;
    current = dirname(current);
  }
  throw new Error(
    `spec file not found: ${subdir}/${name} (looked in ${tried.length} ancestor dirs of ${start})`,
  );
}
