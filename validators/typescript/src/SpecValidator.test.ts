import { describe, expect, test } from "vitest";
import {
  SpecValidator,
  parseYamlWithPositions,
  positionFor,
  resolveSpecPath,
} from "./index.ts";
import {
  ajvFailureErrors,
  errorFromUnknown,
  formatAjvError,
  pinnedVersionMismatchMessage,
  resolveAjvCtor,
  yamlErrorOffset,
} from "./SpecValidator.ts";

const VALID = `version: CURRENT
types:
  - user:
      fields:
        - id:
            type: integer
      target: StandardCrud
`;

describe("parseYamlWithPositions / positionFor", () => {
  test("valid YAML parses with no errors and resolves node positions", () => {
    const { doc, lineCounter } = parseYamlWithPositions(VALID);
    expect(doc.errors).toEqual([]);
    const pos = positionFor(doc, lineCounter, "/types/0/user/fields");
    expect(pos).toEqual({ line: expect.any(Number), col: expect.any(Number) });
  });

  test("positionFor falls back to the document root for an absent path", () => {
    const { doc, lineCounter } = parseYamlWithPositions(VALID);
    expect(positionFor(doc, lineCounter, "/nope/99")).toEqual({
      line: expect.any(Number),
      col: expect.any(Number),
    });
  });

  test("descending past a scalar / bad array index stops at that node", () => {
    const { doc, lineCounter } = parseYamlWithPositions(VALID);
    expect(
      positionFor(doc, lineCounter, "/types/0/user/target/deeper"),
    ).toEqual({ line: expect.any(Number), col: expect.any(Number) });
    expect(positionFor(doc, lineCounter, "/types/notanindex")).toEqual({
      line: expect.any(Number),
      col: expect.any(Number),
    });
  });
});

describe("yamlErrorOffset / ajvFailureErrors", () => {
  test("yamlErrorOffset uses the first pos entry or 0", () => {
    expect(yamlErrorOffset([12, 15])).toBe(12);
    expect(yamlErrorOffset(undefined)).toBe(0);
    expect(yamlErrorOffset(null)).toBe(0);
  });

  test("ajvFailureErrors treats nullish as an empty list", () => {
    const errs = [{ keyword: "type", instancePath: "" }];
    expect(ajvFailureErrors(errs)).toBe(errs);
    expect(ajvFailureErrors(null)).toEqual([]);
    expect(ajvFailureErrors(undefined)).toEqual([]);
  });
});

describe("resolveAjvCtor / formatAjvError / pinnedVersionMismatchMessage", () => {
  class FakeAjv {
    opts: unknown;
    constructor(opts: unknown) {
      this.opts = opts;
    }
    compile(): () => boolean {
      return () => true;
    }
  }

  test("resolveAjvCtor prefers a default export, else the module itself", () => {
    expect(resolveAjvCtor({ default: FakeAjv })).toBe(FakeAjv);
    expect(resolveAjvCtor(FakeAjv)).toBe(FakeAjv);
  });

  test("formatAjvError uses (root) when instancePath is empty", () => {
    expect(
      formatAjvError({
        keyword: "type",
        instancePath: "",
        message: "must be string",
      }),
    ).toBe("(root) must be string");
  });

  test("formatAjvError appends additionalProperty / missingProperty / allowedValues", () => {
    expect(
      formatAjvError({
        keyword: "additionalProperties",
        instancePath: "/x",
        message: "must NOT have additional properties",
        params: { additionalProperty: "bogus" },
      }),
    ).toBe("/x must NOT have additional properties (property: bogus)");
    expect(
      formatAjvError({
        keyword: "required",
        instancePath: "/x",
        message: "must have required property 'fields'",
        params: { missingProperty: "fields" },
      }),
    ).toBe("/x must have required property 'fields' (missing: fields)");
    expect(
      formatAjvError({
        keyword: "enum",
        instancePath: "/x",
        message: "must be equal to one of the allowed values",
        params: { allowedValues: ["a", "b"] },
      }),
    ).toBe("/x must be equal to one of the allowed values (allowed: a, b)");
  });

  test("formatAjvError omits a suffix when params are missing, empty, or falsy", () => {
    expect(
      formatAjvError({
        keyword: "type",
        instancePath: "/x",
        message: "must be string",
      }),
    ).toBe("/x must be string");
    expect(
      formatAjvError({
        keyword: "type",
        instancePath: "/x",
        message: "must be string",
        params: {},
      }),
    ).toBe("/x must be string");
    expect(
      formatAjvError({
        keyword: "additionalProperties",
        instancePath: "/x",
        message: "must NOT have additional properties",
        params: { additionalProperty: "" },
      }),
    ).toBe("/x must NOT have additional properties");
  });

  test("pinnedVersionMismatchMessage names the pinned version", () => {
    expect(pinnedVersionMismatchMessage("CURRENT")).toBe(
      "version must be CURRENT (this engine is pinned to CURRENT)",
    );
    expect(pinnedVersionMismatchMessage("1.0.0")).toBe(
      "version must be 1.0.0 (this engine is pinned to 1.0.0)",
    );
  });
});

describe("errorFromUnknown", () => {
  test("uses Error.message or String() for other values", () => {
    expect(errorFromUnknown(new Error("boom"))).toBe("boom");
    expect(errorFromUnknown("nope")).toBe("nope");
  });
});

describe("SpecValidator constructed with an absolute spec path", () => {
  test("validates against that spec and reuses the compiled schema", async () => {
    const specPath = await resolveSpecPath(
      "backend",
      "datasource-types.spec.yaml",
    );
    const validator = new SpecValidator(specPath);
    const first = await validator.validate(VALID);
    const second = await validator.validate(VALID);
    expect(first).toEqual({ valid: true, errors: [] });
    expect(second).toEqual({ valid: true, errors: [] });
  });

  test("accepts a path thunk", async () => {
    const specPath = await resolveSpecPath(
      "backend",
      "datasource-types.spec.yaml",
    );
    const validator = new SpecValidator(async () => specPath);
    const result = await validator.validate(VALID);
    expect(result).toEqual({ valid: true, errors: [] });
  });
});

describe("SpecValidator pinned to a version", () => {
  test("rejects a document for a different version", async () => {
    const validator = new SpecValidator({
      subdir: "backend",
      name: "datasource-types.spec.yaml",
      version: "CURRENT",
    });
    const result = await validator.validate(VALID.replace("CURRENT", "1.0.0"));
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/pinned to CURRENT/);
  });

  test("surfaces a missing spec file as a version-path error", async () => {
    const result = await new SpecValidator({
      subdir: "backend",
      name: "does-not-exist.spec.yaml",
      version: "CURRENT",
    }).validate("version: CURRENT\ntypes: []\n");
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/spec file not found/);
  });
});
