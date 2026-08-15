import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";
import type {
  AjvError,
  AjvLike,
  SpecValidationError,
  SpecValidationResult,
  ValidateFn,
} from "./types.ts";
import { parseYamlWithPositions, positionFor } from "./yaml-positions.ts";

type SpecPathSource = string | (() => Promise<string>);
type AjvCtorType = new (opts: unknown) => AjvLike;

export function yamlErrorOffset(
  pos: readonly number[] | undefined | null,
): number {
  return pos ? pos[0] : 0;
}

export function ajvFailureErrors(
  errors: AjvError[] | null | undefined,
): AjvError[] {
  return errors ?? [];
}

/** CJS/ESM interop: `ajv/dist/2020.js` may be the class or `{ default: class }`. */
export function resolveAjvCtor(mod: unknown): AjvCtorType {
  const withDefault = mod as { default?: AjvCtorType };
  return (withDefault.default ?? (mod as AjvCtorType)) as AjvCtorType;
}

function newAjv(): AjvLike {
  return new (resolveAjvCtor(Ajv2020))({ allErrors: true, strict: false });
}

const AJV_PARAM_SUFFIX: Array<[string, (v: unknown) => string]> = [
  ["additionalProperty", (v) => `(property: ${String(v)})`],
  ["missingProperty", (v) => `(missing: ${String(v)})`],
  ["allowedValues", (v) => `(allowed: ${(v as unknown[]).join(", ")})`],
];

function ajvParamSuffix(params?: Record<string, unknown>): string {
  if (!params) return "";
  for (const [key, fmt] of AJV_PARAM_SUFFIX) {
    if (params[key]) return ` ${fmt(params[key])}`;
  }
  return "";
}

export function formatAjvError(e: AjvError): string {
  const where = e.instancePath || "(root)";
  return `${where} ${e.message}${ajvParamSuffix(e.params)}`;
}

/**
 * Validates a `deterministic/*.yaml` document against one strict JSON Schema
 * (draft 2020-12, authored in YAML). The base class carries AJV compilation
 * and source-position mapping so every error reports `{ line, col }`.
 * Subclasses bind it to a specific spec file; construct it directly with an
 * absolute path to validate against a spec that lives outside this package.
 */
export class SpecValidator {
  readonly #resolveSpecPath: () => Promise<string>;
  #compiled: ValidateFn | null = null;

  constructor(specPath: SpecPathSource) {
    this.#resolveSpecPath =
      typeof specPath === "string" ? async () => specPath : specPath;
  }

  async validate(text: string): Promise<SpecValidationResult> {
    const { doc, lineCounter } = parseYamlWithPositions(text);

    if (doc.errors.length > 0) {
      const errors = doc.errors.map((e): SpecValidationError => {
        const offset = yamlErrorOffset(e.pos);
        const { line, col } = lineCounter.linePos(offset);
        return { line, col, instancePath: "", message: e.message };
      });
      return { valid: false, errors };
    }

    const data = doc.toJS();
    const validate = await this.#compiledSpec();
    if (validate(data)) return { valid: true, errors: [] };

    const errors = ajvFailureErrors(validate.errors).map(
      (e): SpecValidationError => {
        const { line, col } = positionFor(doc, lineCounter, e.instancePath);
        return {
          line,
          col,
          instancePath: e.instancePath,
          message: formatAjvError(e),
        };
      },
    );
    return { valid: false, errors };
  }

  async validateFile(path: string): Promise<SpecValidationResult> {
    const text = await readFile(path, "utf8");
    return this.validate(text);
  }

  async #compiledSpec(): Promise<ValidateFn> {
    if (this.#compiled) return this.#compiled;
    const specText = await readFile(await this.#resolveSpecPath(), "utf8");
    const schema = parseDocument(specText).toJS();
    this.#compiled = newAjv().compile(schema);
    return this.#compiled;
  }
}
