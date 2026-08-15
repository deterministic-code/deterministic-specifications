import { readFile } from "node:fs/promises";
import { parseDocument } from "yaml";
import type {
  CompiledSpec,
  SpecValidationError,
  SpecValidationResult,
} from "./types.ts";
import { parseYamlWithPositions, positionFor } from "./yaml-positions.ts";
import { collapseOneOfErrors, formatAjvError, newAjv } from "./ajv-oneof.ts";

type SpecPathSource = string | (() => Promise<string>);

/**
 * Validates a `deterministic/*.yaml` document against one strict JSON Schema
 * (draft 2020-12, authored in YAML). The base class carries the whole engine —
 * AJV compilation, `oneOf` error collapsing, and source-position mapping so
 * every error reports `{ line, col }`. Subclasses bind it to a specific spec
 * file; construct it directly with an absolute path to validate against a spec
 * that lives outside this package.
 */
export class SpecValidator {
  readonly #resolveSpecPath: () => Promise<string>;
  #compiled: CompiledSpec | null = null;

  constructor(specPath: SpecPathSource) {
    this.#resolveSpecPath =
      typeof specPath === "string" ? async () => specPath : specPath;
  }

  async validate(text: string): Promise<SpecValidationResult> {
    const { doc, lineCounter } = parseYamlWithPositions(text);

    if (doc.errors.length > 0) {
      const errors = doc.errors.map((e): SpecValidationError => {
        const offset = e.pos ? e.pos[0] : 0;
        const { line, col } = lineCounter.linePos(offset);
        return { line, col, instancePath: "", message: e.message };
      });
      return { valid: false, errors };
    }

    const data = doc.toJS();
    const { validate, schema } = await this.#compiledSpec();
    if (validate(data)) return { valid: true, errors: [] };

    const collapsed = collapseOneOfErrors(validate.errors ?? [], schema, data);
    const errors = collapsed.map((e): SpecValidationError => {
      const { line, col } = positionFor(doc, lineCounter, e.instancePath);
      return {
        line,
        col,
        instancePath: e.instancePath,
        message: formatAjvError(e),
      };
    });
    return { valid: false, errors };
  }

  async validateFile(path: string): Promise<SpecValidationResult> {
    const text = await readFile(path, "utf8");
    return this.validate(text);
  }

  async #compiledSpec(): Promise<CompiledSpec> {
    if (this.#compiled) return this.#compiled;
    const specText = await readFile(await this.#resolveSpecPath(), "utf8");
    const schema = parseDocument(specText).toJS();
    this.#compiled = { validate: newAjv().compile(schema), schema };
    return this.#compiled;
  }
}
