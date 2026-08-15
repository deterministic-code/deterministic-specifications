import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  DatasourceTypesValidator,
  FrontendBindingsValidator,
  RoutesValidator,
  ServicesValidator,
  SpecValidator,
  ViewTypesValidator,
  parseYamlWithPositions,
  positionFor,
  resolveSpecPath,
} from "./index.ts";
import {
  ajvFailureErrors,
  formatAjvError,
  resolveAjvCtor,
  yamlErrorOffset,
} from "./SpecValidator.ts";

const datasource = new DatasourceTypesValidator();

const VALID = `types:
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

describe("DatasourceTypesValidator.validate", () => {
  test("accepts a valid datasource_types document", async () => {
    const result = await datasource.validate(VALID);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("reports a positioned error for a missing top-level required key", async () => {
    const result = await datasource.validate("not_types: 1\n");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatchObject({
      line: expect.any(Number),
      col: expect.any(Number),
      message: expect.any(String),
    });
  });

  test("reports an unexpected-property error (additionalProperties)", async () => {
    const result = await datasource.validate(
      "types:\n  - user:\n      fields:\n        - id:\n            type: integer\n      bogus_key: 1\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /bogus_key/.test(e.message))).toBe(true);
  });

  test("reports a missing required property (fields)", async () => {
    const result = await datasource.validate(
      "types:\n  - user:\n      target: None\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /fields/.test(e.message))).toBe(true);
  });

  test("reports an enum (allowed-values) violation", async () => {
    const result = await datasource.validate(
      "types:\n  - user:\n      fields:\n        - id:\n            type: integer\n      datasource_type: nonsense\n",
    );
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => /readonly-lookup|many-to-many/.test(e.message)),
    ).toBe(true);
  });

  test("reports a positioned error for a field-shape mismatch", async () => {
    const result = await datasource.validate(
      "types:\n  - user:\n      fields:\n        - id:\n            bogus_field_key: true\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatchObject({
      instancePath: expect.any(String),
    });
  });

  test("reports a type mismatch (scalar where an array is required)", async () => {
    const result = await datasource.validate("types: not-a-list\n");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("an empty document is invalid", async () => {
    const result = await datasource.validate("");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("validateFile", () => {
  let dir = "";
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "spec-validate-"));
  });
  afterAll(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  test("reads and validates a valid file from disk", async () => {
    const path = join(dir, "valid.yaml");
    await writeFile(path, VALID);
    const result = await datasource.validateFile(path);
    expect(result.valid).toBe(true);
  });

  test("reads and reports positioned errors for an invalid file", async () => {
    const path = join(dir, "invalid.yaml");
    await writeFile(path, "not_types: 1\n");
    const result = await datasource.validateFile(path);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
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

describe("resolveAjvCtor / formatAjvError", () => {
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
});

describe("SpecValidator constructed with an absolute spec path", () => {
  test("validates against that spec and reuses the compiled schema", async () => {
    const specPath = await resolveSpecPath("backend", "datasource-types.spec.yaml");
    const validator = new SpecValidator(specPath);
    const first = await validator.validate(VALID);
    const second = await validator.validate(VALID);
    expect(first).toEqual({ valid: true, errors: [] });
    expect(second).toEqual({ valid: true, errors: [] });
  });
});

describe("YAML syntax errors", () => {
  test("reports a positioned parse error for unterminated input", async () => {
    const result = await datasource.validate("foo: [unterminated\n");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatchObject({
      instancePath: "",
      message: expect.any(String),
      line: expect.any(Number),
      col: expect.any(Number),
    });
  });
});

describe("other spec validators accept a minimal valid document", () => {
  test("ViewTypesValidator", async () => {
    const result = await new ViewTypesValidator().validate("types: []\n");
    expect(result.valid).toBe(true);
  });

  test("ServicesValidator", async () => {
    const result = await new ServicesValidator().validate("services: []\n");
    expect(result.valid).toBe(true);
  });

  test("FrontendBindingsValidator", async () => {
    const result = await new FrontendBindingsValidator().validate(
      "datasources: []\n",
    );
    expect(result.valid).toBe(true);
  });

  test("RoutesValidator", async () => {
    const result = await new RoutesValidator().validate("routes: []\n");
    expect(result.valid).toBe(true);
  });

  test("ViewTypesValidator rejects a union vs shaped mismatch", async () => {
    const result = await new ViewTypesValidator().validate(
      "types:\n  - foo:\n      one_of: [a]\n      fields: []\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("RoutesValidator rejects a nested route-shape mismatch", async () => {
    const result = await new RoutesValidator().validate(
      "routes:\n  - custom_route:\n      methods: [GET]\n      path: /x\n      bogus: true\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("every spec validator loads its schema and rejects an empty document", () => {
  const validators = {
    datasource: new DatasourceTypesValidator(),
    view: new ViewTypesValidator(),
    routes: new RoutesValidator(),
    services: new ServicesValidator(),
    bindings: new FrontendBindingsValidator(),
  };
  for (const [name, validator] of Object.entries(validators)) {
    test(name, async () => {
      const result = await validator.validate("");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});
