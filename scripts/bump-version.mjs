#!/usr/bin/env node
/**
 * Archive CURRENT backend/, frontend/, and validator/ into versions/<semver>/.
 *
 *   node scripts/bump-version.mjs 1.1.0
 *
 * Moves the three live folders into the archive, stamps spec `version:` / `$id`,
 * and rewrites the frozen validator engine + tests so they stay pinned to that
 * semver. Those frozen tests keep running as proof the old version still works.
 *
 * If versions/<semver>/ already has specs but no validator/ (first 1.0.0 freeze),
 * only validator/ is moved in.
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
const LIVE_DIRS = ["backend", "frontend", "validator"];
const ENGINE_FILES = [
  "DatasourceTypesValidator.ts",
  "ViewTypesValidator.ts",
  "RoutesValidator.ts",
  "ServicesValidator.ts",
  "FrontendBindingsValidator.ts",
];

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
  for (const subdir of ["backend", "frontend"]) {
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
  const validatorDir = join(dir, "validator");
  for (const entry of await readdir(validatorDir)) {
    if (!entry.endsWith(".ts")) continue;
    const path = join(validatorDir, entry);
    await writeFile(
      path,
      stampValidatorText(await readFile(path, "utf8"), semver),
    );
  }
}

async function assertCompleteArchive(dir) {
  const missing = [];
  for (const subdir of ["backend", "frontend", "validator"]) {
    if (!(await exists(join(dir, subdir)))) missing.push(subdir);
  }
  for (const file of ENGINE_FILES) {
    if (!(await exists(join(dir, "validator", file)))) {
      missing.push(`validator/${file}`);
    }
  }
  if (!(await exists(join(dir, "validator", "validator.test.ts")))) {
    missing.push("validator/validator.test.ts");
  }
  if (missing.length > 0) {
    console.error(`incomplete archive: missing ${missing.join(", ")}`);
    process.exit(1);
  }
}

for (const name of LIVE_DIRS) {
  if (!(await exists(join(repoRoot, name)))) {
    console.error(`missing live folder: ${name}/`);
    process.exit(1);
  }
}

await mkdir(join(repoRoot, "versions"), { recursive: true });
const destRoot = join(repoRoot, "versions", version);
const destExists = await exists(destRoot);
const destHasValidator =
  destExists && (await exists(join(destRoot, "validator")));

if (destHasValidator) {
  console.error(`versions/${version}/validator/ already exists`);
  process.exit(1);
}

if (!destExists) {
  await mkdir(destRoot, { recursive: true });
  for (const name of LIVE_DIRS) {
    await rename(join(repoRoot, name), join(destRoot, name));
  }
  await stampSpecs(destRoot, version);
  await stampValidator(destRoot, version);
} else {
  await rename(join(repoRoot, "validator"), join(destRoot, "validator"));
  await stampValidator(destRoot, version);
}

await assertCompleteArchive(destRoot);
console.log(`wrote versions/${version}/`);
