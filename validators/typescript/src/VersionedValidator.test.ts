import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  DatasourceTypesValidator,
  FrontendBindingsValidator,
  RoutesValidator,
  ServicesValidator,
  ViewTypesValidator,
  VersionedValidator,
  engineConstructor,
} from "./VersionedValidator.ts";

const VALID = `version: CURRENT
types:
  - user:
      fields:
        - id:
            type: integer
      target: StandardCrud
`;

describe("VersionedValidator dispatcher", () => {
  test("CURRENT documents use the live engine", async () => {
    const result = await new DatasourceTypesValidator().validate(VALID);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test("1.0.0 documents use the frozen engine", async () => {
    const result = await new DatasourceTypesValidator().validate(
      VALID.replace("CURRENT", "1.0.0"),
    );
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test("rejects a missing version with a positioned error", async () => {
    const result = await new DatasourceTypesValidator().validate("types: []\n");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({
      instancePath: "/version",
      message: expect.stringMatching(/missing required property version/),
    });
  });

  test("rejects a non-mapping document before loading an engine", async () => {
    const result = await new DatasourceTypesValidator().validate(
      "- just a list\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({
      instancePath: "/version",
      message: expect.stringMatching(/must be a mapping/),
    });
  });

  test("rejects an unknown published version", async () => {
    const result = await new DatasourceTypesValidator().validate(
      "version: 9.9.9\ntypes: []\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({
      instancePath: "/version",
      message: expect.stringMatching(/unknown spec version: 9.9.9/),
    });
  });

  test("rejects a malformed version token", async () => {
    const result = await new DatasourceTypesValidator().validate(
      "version: latest\ntypes: []\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/CURRENT or a semver/);
  });

  test("reports YAML syntax errors without loading an engine", async () => {
    const result = await new DatasourceTypesValidator().validate(
      "foo: [unterminated\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({
      instancePath: "",
      message: expect.any(String),
    });
  });

  test("validateFile reads from disk and dispatches", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dispatch-"));
    try {
      const path = join(dir, "ok.yaml");
      await writeFile(path, VALID);
      const result = await new DatasourceTypesValidator().validateFile(path);
      expect(result.valid).toBe(true);
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  });

  test("engineConstructor requires the class export named after the file", () => {
    expect(() =>
      engineConstructor({}, "DatasourceTypesValidator.ts"),
    ).toThrow(/missing export DatasourceTypesValidator/);
    class Fake {
      async validate() {
        return { valid: true, errors: [] };
      }
      async validateFile() {
        return { valid: true, errors: [] };
      }
    }
    expect(
      engineConstructor(
        { DatasourceTypesValidator: Fake },
        "DatasourceTypesValidator.ts",
      ),
    ).toBe(Fake);
  });

  test("surfaces a missing engine module as a version-path error", async () => {
    const result = await new VersionedValidator("DoesNotExist.ts").validate(
      VALID,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.instancePath).toBe("/version");
    expect(result.errors[0]?.message.length).toBeGreaterThan(0);
  });

  test("other facades dispatch CURRENT documents", async () => {
    expect(
      (await new ViewTypesValidator().validate("version: CURRENT\ntypes: []\n"))
        .valid,
    ).toBe(true);
    expect(
      (
        await new ServicesValidator().validate(
          "version: CURRENT\nservices: []\n",
        )
      ).valid,
    ).toBe(true);
    expect(
      (
        await new RoutesValidator().validate("version: CURRENT\nroutes: []\n")
      ).valid,
    ).toBe(true);
    expect(
      (
        await new FrontendBindingsValidator().validate(
          "version: CURRENT\ndatasources: []\n",
        )
      ).valid,
    ).toBe(true);
  });
});
