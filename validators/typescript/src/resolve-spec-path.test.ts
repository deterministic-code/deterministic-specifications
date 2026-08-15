import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { findSpecPath, resolveSpecPath } from "./resolve-spec-path.ts";

describe("findSpecPath", () => {
  test("resolves a bundled backend spec to a readable file", async () => {
    const path = await findSpecPath("backend", "routes.spec.yaml");
    expect(path).not.toBeNull();
    const text = await readFile(path!, "utf8");
    expect(text).toContain("$schema");
  });

  test("resolves a bundled frontend spec", async () => {
    const path = await findSpecPath("frontend", "bindings.spec.yaml");
    expect(path).not.toBeNull();
  });

  test("returns null for an unknown spec", async () => {
    expect(await findSpecPath("backend", "does-not-exist.spec.yaml")).toBeNull();
  });
});

describe("resolveSpecPath", () => {
  test("returns the path for a known spec", async () => {
    await expect(
      resolveSpecPath("backend", "services.spec.yaml"),
    ).resolves.toContain("services.spec.yaml");
  });

  test("throws for an unknown spec", async () => {
    await expect(
      resolveSpecPath("backend", "nope.spec.yaml"),
    ).rejects.toThrow(/spec file not found/);
  });
});
