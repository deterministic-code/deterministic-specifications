#!/usr/bin/env node
/**
 * Archive the live backend/ and frontend/ folders into versions/<semver>/.
 *
 *   node scripts/bump-version.mjs 1.1.0
 *
 * Moves the live spec folders into the archive and stamps spec `version:` / `$id`.
 * Validator engines live in deterministic-specifications-typescript.
 */
import { access, mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stampSpecText } from "./lib/stamp-version.mjs";

const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const LIVE_SPEC_DIRS = ["backend", "frontend"];

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const version = process.argv[2];

if (!version || !SEMVER.test(version)) {
  console.error("usage: node scripts/bump-version.mjs <semver>");
  process.exit(1);
}

async function exists(path) {
  return access(path).then(
    () => true,
    () => false,
  );
}

async function stampSpecs(dir, semver) {
  for (const subdir of LIVE_SPEC_DIRS) {
    const specDir = join(dir, subdir);
    if (!(await exists(specDir))) continue;
    for (const entry of await readdir(specDir)) {
      if (!entry.endsWith(".spec.yaml") && entry !== "types.yaml") continue;
      const path = join(specDir, entry);
      await writeFile(path, stampSpecText(await readFile(path, "utf8"), semver));
    }
  }
}

async function assertCompleteArchive(dir) {
  const missing = [];
  for (const subdir of LIVE_SPEC_DIRS) {
    if (!(await exists(join(dir, subdir)))) missing.push(subdir);
  }
  if (missing.length > 0) {
    console.error(`incomplete archive: missing ${missing.join(", ")}`);
    process.exit(1);
  }
}

for (const name of LIVE_SPEC_DIRS) {
  if (!(await exists(join(repoRoot, name)))) {
    console.error(`missing live folder: ${name}/`);
    process.exit(1);
  }
}

const destRoot = join(repoRoot, "versions", version);
if (await exists(destRoot)) {
  console.error(`versions/${version}/ already exists`);
  process.exit(1);
}

await mkdir(join(repoRoot, "versions"), { recursive: true });
await mkdir(destRoot, { recursive: true });
for (const name of LIVE_SPEC_DIRS) {
  await rename(join(repoRoot, name), join(destRoot, name));
}
await stampSpecs(destRoot, version);
await assertCompleteArchive(destRoot);
console.log(`wrote versions/${version}/`);
