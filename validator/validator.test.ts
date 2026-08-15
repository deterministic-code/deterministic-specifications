import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DatasourceTypesValidator } from "./DatasourceTypesValidator.ts";
import { FrontendBindingsValidator } from "./FrontendBindingsValidator.ts";
import { RoutesValidator } from "./RoutesValidator.ts";
import { ServicesValidator } from "./ServicesValidator.ts";
import { ViewTypesValidator } from "./ViewTypesValidator.ts";

const datasource = new DatasourceTypesValidator();

const VALID = `version: CURRENT
types:
  - user:
      fields:
        - id:
            type: integer
      target: StandardCrud
`;

describe("CURRENT DatasourceTypesValidator", () => {
  test("accepts a valid datasource_types document", async () => {
    const result = await datasource.validate(VALID);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects a document pinned to a different version", async () => {
    const result = await datasource.validate(VALID.replace("CURRENT", "1.0.0"));
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/pinned to CURRENT/);
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
      "version: CURRENT\ntypes:\n  - user:\n      fields:\n        - id:\n            type: integer\n      bogus_key: 1\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /bogus_key/.test(e.message))).toBe(true);
  });

  test("reports a missing required property (fields)", async () => {
    const result = await datasource.validate(
      "version: CURRENT\ntypes:\n  - user:\n      target: None\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /fields/.test(e.message))).toBe(true);
  });

  test("reports an enum (allowed-values) violation", async () => {
    const result = await datasource.validate(
      "version: CURRENT\ntypes:\n  - user:\n      fields:\n        - id:\n            type: integer\n      datasource_type: nonsense\n",
    );
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => /readonly-lookup|many-to-many/.test(e.message)),
    ).toBe(true);
  });

  test("accepts unsigned integer-family field types", async () => {
    const result = await datasource.validate(`version: CURRENT
types:
  - sample:
      fields:
        - count:
            type: unsignedinteger
            default_value: 0
        - big_count:
            type: unsignedbiginteger
            default_value: "18446744073709551615"
        - small_count:
            type: unsignedsmallinteger
            min_size: 0
`);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects a negative default_value on unsignedinteger", async () => {
    const result = await datasource.validate(`version: CURRENT
types:
  - sample:
      fields:
        - count:
            type: unsignedinteger
            default_value: -1
`);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("reports a positioned error for a field-shape mismatch", async () => {
    const result = await datasource.validate(
      "version: CURRENT\ntypes:\n  - user:\n      fields:\n        - id:\n            bogus_field_key: true\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatchObject({
      instancePath: expect.any(String),
    });
  });

  test("reports a type mismatch (scalar where an array is required)", async () => {
    const result = await datasource.validate(
      "version: CURRENT\ntypes: not-a-list\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("an empty document is invalid", async () => {
    const result = await datasource.validate("");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

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

describe("CURRENT validateFile", () => {
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

describe("CURRENT other spec validators", () => {
  test("ViewTypesValidator", async () => {
    const result = await new ViewTypesValidator().validate(
      "version: CURRENT\ntypes: []\n",
    );
    expect(result.valid).toBe(true);
  });

  test("ServicesValidator", async () => {
    const result = await new ServicesValidator().validate(
      "version: CURRENT\nservices: []\n",
    );
    expect(result.valid).toBe(true);
  });

  test("FrontendBindingsValidator", async () => {
    const result = await new FrontendBindingsValidator().validate(
      "version: CURRENT\ndatasources: []\n",
    );
    expect(result.valid).toBe(true);
  });

  test("RoutesValidator", async () => {
    const result = await new RoutesValidator().validate(
      "version: CURRENT\nroutes: []\n",
    );
    expect(result.valid).toBe(true);
  });

  test("ViewTypesValidator rejects a union vs shaped mismatch", async () => {
    const result = await new ViewTypesValidator().validate(
      "version: CURRENT\ntypes:\n  - foo:\n      one_of: [a]\n      fields: []\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("RoutesValidator rejects a nested route-shape mismatch", async () => {
    const result = await new RoutesValidator().validate(
      "version: CURRENT\nroutes:\n  - custom_route:\n      methods: [GET]\n      path: /x\n      bogus: true\n",
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("CURRENT every spec validator rejects an empty document", () => {
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
