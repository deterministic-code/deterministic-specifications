import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(pkgRoot));

async function syncDir(subdir) {
  const from = join(repoRoot, subdir);
  const to = join(pkgRoot, subdir);
  await rm(to, { force: true, recursive: true });
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from)) {
    if (!entry.endsWith(".spec.yaml")) continue;
    await cp(join(from, entry), join(to, entry));
  }
}

await syncDir("backend");
await syncDir("frontend");
