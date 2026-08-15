import { access } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  findEngineDir,
  listPublishedVersions,
  resolveEngineDir,
  resolveSpecPath,
} from "./resolveSpecPath.ts";
import {
  SPEC_FILES,
  VALIDATOR_ENGINE_FILES,
  VALIDATOR_TEST_FILE,
} from "./specVersion.ts";

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

describe("published archive completeness", () => {
  test("every published version has specs, a validator engine, and frozen tests", async () => {
    const published = await listPublishedVersions();
    expect(published.length).toBeGreaterThan(0);
    for (const version of published) {
      for (const spec of SPEC_FILES) {
        await expect(
          resolveSpecPath(spec.subdir, spec.name, version),
        ).resolves.toContain(join("versions", version, spec.subdir, spec.name));
      }
      const engineDir = await resolveEngineDir(version);
      expect(engineDir).toContain(join("versions", version, "validator"));
      for (const file of VALIDATOR_ENGINE_FILES) {
        expect(await exists(join(engineDir, file))).toBe(true);
      }
      expect(await exists(join(engineDir, VALIDATOR_TEST_FILE))).toBe(true);
    }
  });

  test("CURRENT has a live validator engine and tests", async () => {
    const engineDir = await findEngineDir("CURRENT");
    expect(engineDir).not.toBeNull();
    for (const file of VALIDATOR_ENGINE_FILES) {
      expect(await exists(join(engineDir!, file))).toBe(true);
    }
    expect(await exists(join(engineDir!, VALIDATOR_TEST_FILE))).toBe(true);
  });
});
