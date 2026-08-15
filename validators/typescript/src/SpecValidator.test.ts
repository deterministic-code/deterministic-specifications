import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  DatasourceTypesValidator,
  FrontendBindingsValidator,
  RoutesValidator,
  ServicesValidator,
  ViewTypesValidator,
  parseYamlWithPositions,
  positionFor,
} from "./index.ts";

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

  test("collapses a oneOf-branch mismatch into a single positioned error", async () => {
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
