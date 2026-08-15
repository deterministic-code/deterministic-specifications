import {
  CURRENT_VERSION,
  VALIDATOR_ENGINE_FILE,
  VALIDATOR_ENGINES,
  isPublishedVersion,
  isSpecRef,
  isSpecVersion,
  parseSpecVersion,
} from "./specVersion.ts";
import { describe, expect, test } from "vitest";

describe("catalog", () => {
  test("engine module is engines.ts and five named engines are listed", () => {
    expect(VALIDATOR_ENGINE_FILE).toBe("engines.ts");
    expect(VALIDATOR_ENGINES.map(([className]) => className)).toEqual([
      "DatasourceTypesValidator",
      "ViewTypesValidator",
      "RoutesValidator",
      "ServicesValidator",
      "FrontendBindingsValidator",
    ]);
  });
});

describe("isPublishedVersion / isSpecVersion", () => {
  test("accepts X.Y.Z and CURRENT", () => {
    expect(isPublishedVersion("1.0.0")).toBe(true);
    expect(isPublishedVersion("0.3.0")).toBe(true);
    expect(isPublishedVersion("CURRENT")).toBe(false);
    expect(isPublishedVersion("1.0")).toBe(false);
    expect(isPublishedVersion("v1.0.0")).toBe(false);
    expect(isSpecVersion("1.0.0")).toBe(true);
    expect(isSpecVersion(CURRENT_VERSION)).toBe(true);
    expect(isSpecVersion("latest")).toBe(false);
  });
});

describe("isSpecRef", () => {
  test("requires string subdir, name, and version", () => {
    expect(
      isSpecRef({ subdir: "backend", name: "x.spec.yaml", version: "CURRENT" }),
    ).toBe(true);
    expect(isSpecRef(null)).toBe(false);
    expect(isSpecRef("backend")).toBe(false);
    expect(isSpecRef({ subdir: 1, name: "x", version: "CURRENT" })).toBe(false);
    expect(isSpecRef({ subdir: "backend", name: 1, version: "CURRENT" })).toBe(
      false,
    );
    expect(isSpecRef({ subdir: "backend", name: "x.spec.yaml" })).toBe(false);
  });
});

describe("parseSpecVersion", () => {
  test("reads CURRENT and a semver from a mapping", () => {
    expect(parseSpecVersion({ version: "CURRENT", types: [] })).toEqual({
      ok: true,
      version: "CURRENT",
    });
    expect(parseSpecVersion({ version: "1.0.0" })).toEqual({
      ok: true,
      version: "1.0.0",
    });
  });

  test("rejects non-mappings, missing version, and bad tokens", () => {
    expect(parseSpecVersion(null).ok).toBe(false);
    expect(parseSpecVersion(["x"]).ok).toBe(false);
    expect(parseSpecVersion({ types: [] })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/missing required property version/),
    });
    expect(parseSpecVersion({ version: 1 })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/CURRENT or a semver/),
    });
    expect(parseSpecVersion({ version: "1.0" })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/CURRENT or a semver/),
    });
  });
});
