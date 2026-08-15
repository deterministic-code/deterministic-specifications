import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(pkgRoot));

async function syncSpecDir(from, to) {
  await rm(to, { force: true, recursive: true });
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from)) {
    if (!entry.endsWith(".spec.yaml")) continue;
    await cp(join(from, entry), join(to, entry));
  }
}

async function syncValidatorDir(from, to) {
  await rm(to, { force: true, recursive: true });
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from)) {
    if (!entry.endsWith(".ts")) continue;
    await cp(join(from, entry), join(to, entry));
  }
}

async function syncDir(subdir) {
  await syncSpecDir(join(repoRoot, subdir), join(pkgRoot, subdir));
}

await syncDir("backend");
await syncDir("frontend");

try {
  await syncValidatorDir(join(repoRoot, "validator"), join(pkgRoot, "validator"));
} catch (err) {
  if (!(err && typeof err === "object" && "code" in err && err.code === "ENOENT")) {
    throw err;
  }
}

const versionRoot = join(repoRoot, "versions");
const versionDest = join(pkgRoot, "versions");
await rm(versionDest, { force: true, recursive: true });
let versions = [];
try {
  versions = await readdir(versionRoot);
} catch (err) {
  if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
    versions = [];
  } else {
    throw err;
  }
}
for (const version of versions) {
  for (const subdir of ["backend", "frontend"]) {
    const from = join(versionRoot, version, subdir);
    try {
      await syncSpecDir(from, join(versionDest, version, subdir));
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "ENOENT"
      ) {
        continue;
      }
      throw err;
    }
  }
  const fromValidator = join(versionRoot, version, "validator");
  try {
    await syncValidatorDir(
      fromValidator,
      join(versionDest, version, "validator"),
    );
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      continue;
    }
    throw err;
  }
}
