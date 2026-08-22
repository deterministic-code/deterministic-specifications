#!/usr/bin/env node
/**
 * Archive the live backend/, frontend/, and engine files into versions/<semver>/.
 *
 *   node scripts/bump-version.mjs 1.1.0
 *
 * Moves the live spec folders and validators/typescript/src/validators/engines.ts
 * into the archive, stamps spec `version:` / `$id`, writes validators/engines.js
 * (runtime; imports the compiled bundle), and rewrites the frozen engine so it
 * stays pinned to that semver. Live tests stay put and load every archived
 * engine by version.
 *
 * Does not move the rest of validators/typescript/ (shared engine, tests,
 * package.json, etc.).
 *
 * If versions/<semver>/ already has specs but no validators/ (first freeze),
 * only the live engine file is moved in.
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
const ENGINE_SOURCE = "engines.ts";
const ENGINE_FILE = "engines.js";
const ENGINE_EXPORTS = [
  "DatasourceTypesValidator",
  "DatasourceSeedsValidator",
  "ViewTypesValidator",
  "RoutesValidator",
  "RoutesApiValidator",
  "ServicesValidator",
  "FrontendBindingsValidator",
];

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const liveEngineDir = join(
  repoRoot,
  "validators",
  "typescript",
  "src",
  "validators",
);
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

function archiveEnginesJs(semver) {
  return `import { SpecValidator } from "../../../validators/typescript/dist/index.js";
export const {
  ${ENGINE_EXPORTS.join(",\n  ")},
} = SpecValidator.pinnedEngines("${semver}");
`;
}

async function moveLiveEngine(destRoot) {
  const to = join(destRoot, "validators");
  await mkdir(to, { recursive: true });
  const destTs = join(to, ENGINE_SOURCE);
  await rename(join(liveEngineDir, ENGINE_SOURCE), destTs);
  await writeFile(
    destTs,
    stampValidatorText(await readFile(destTs, "utf8"), version),
  );
  await writeFile(join(to, ENGINE_FILE), archiveEnginesJs(version));
}

async function assertCompleteArchive(dir) {
  const missing = [];
  for (const subdir of [...LIVE_SPEC_DIRS, "validators"]) {
    if (!(await exists(join(dir, subdir)))) missing.push(subdir);
  }
  if (!(await exists(join(dir, "validators", ENGINE_FILE)))) {
    missing.push(`validators/${ENGINE_FILE}`);
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
if (!(await exists(join(liveEngineDir, ENGINE_SOURCE)))) {
  console.error(
    `missing live engine: validators/typescript/src/validators/${ENGINE_SOURCE}`,
  );
  process.exit(1);
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
  await moveLiveEngine(destRoot);
  await stampSpecs(destRoot, version);
} else {
  await moveLiveEngine(destRoot);
}

await assertCompleteArchive(destRoot);
console.log(`wrote versions/${version}/`);
