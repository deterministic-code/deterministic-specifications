#!/usr/bin/env node
/**
 * Archive CURRENT backend/, frontend/, and live engine files into versions/<semver>/.
 *
 *   node scripts/bump-version.mjs 1.1.0
 *
 * Moves the live spec folders and the engine files from validators/typescript/
 * into the archive, stamps spec `version:` / `$id`, and rewrites the frozen
 * validator engine + tests so they stay pinned to that semver. Those frozen
 * tests keep running as proof the old version still works.
 *
 * Does not move the rest of validators/typescript/ (src, package.json, etc.).
 *
 * If versions/<semver>/ already has specs but no validators/ (first 1.0.0 freeze),
 * only the live engine files are moved in.
 */
import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stampSpecText, stampValidatorText } from "./lib/stamp-version.mjs";

const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const LIVE_SPEC_DIRS = ["backend", "frontend"];
const ENGINE_FILES = [
  "DatasourceTypesValidator.ts",
  "ViewTypesValidator.ts",
  "RoutesValidator.ts",
  "ServicesValidator.ts",
  "FrontendBindingsValidator.ts",
];
const LIVE_ENGINE_FILES = [...ENGINE_FILES, "validator.test.ts"];

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const liveEngineDir = join(repoRoot, "validators", "typescript");
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
      if (!entry.endsWith(".spec.yaml")) continue;
      const path = join(specDir, entry);
      await writeFile(path, stampSpecText(await readFile(path, "utf8"), semver));
    }
  }
}

async function stampValidator(dir, semver) {
  const validatorDir = join(dir, "validators");
  for (const entry of await readdir(validatorDir)) {
    if (!entry.endsWith(".ts")) continue;
    const path = join(validatorDir, entry);
    await writeFile(
      path,
      stampValidatorText(await readFile(path, "utf8"), semver),
    );
  }
}

async function moveLiveEngines(destRoot) {
  const to = join(destRoot, "validators");
  await mkdir(to, { recursive: true });
  for (const file of LIVE_ENGINE_FILES) {
    await rename(join(liveEngineDir, file), join(to, file));
  }
}

async function assertCompleteArchive(dir) {
  const missing = [];
  for (const subdir of [...LIVE_SPEC_DIRS, "validators"]) {
    if (!(await exists(join(dir, subdir)))) missing.push(subdir);
  }
  for (const file of LIVE_ENGINE_FILES) {
    if (!(await exists(join(dir, "validators", file)))) {
      missing.push(`validators/${file}`);
    }
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
for (const file of LIVE_ENGINE_FILES) {
  if (!(await exists(join(liveEngineDir, file)))) {
    console.error(`missing live engine: validators/typescript/${file}`);
    process.exit(1);
  }
}

await mkdir(join(repoRoot, "versions"), { recursive: true });
const destRoot = join(repoRoot, "versions", version);
const destExists = await exists(destRoot);
const destHasValidator =
  destExists && (await exists(join(destRoot, "validators")));

if (destHasValidator) {
  console.error(`versions/${version}/validators/ already exists`);
  process.exit(1);
}

if (!destExists) {
  await mkdir(destRoot, { recursive: true });
  for (const name of LIVE_SPEC_DIRS) {
    await rename(join(repoRoot, name), join(destRoot, name));
  }
  await moveLiveEngines(destRoot);
  await stampSpecs(destRoot, version);
  await stampValidator(destRoot, version);
} else {
  await moveLiveEngines(destRoot);
  await stampValidator(destRoot, version);
}

await assertCompleteArchive(destRoot);
console.log(`wrote versions/${version}/`);
