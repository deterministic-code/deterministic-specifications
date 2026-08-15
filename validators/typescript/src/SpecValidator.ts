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
import { parseYamlWithPositions, positionFor } from "./yamlPositions.ts";
import { resolveSpecPath } from "./resolveSpecPath.ts";
import {
  isSpecRef,
  parseSpecVersion,
  type SpecRef,
} from "./specVersion.ts";

type SpecPathFn = () => Promise<string>;
type SpecPathSource = string | SpecPathFn | SpecRef;
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

export function errorFromUnknown(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function pinnedVersionMismatchMessage(pinned: string): string {
  return `version must be ${pinned} (this engine is pinned to ${pinned})`;
}

/**
 * Validates a `deterministic/*.yaml` document against one strict JSON Schema
 * (draft 2020-12, authored in YAML). The base class carries AJV compilation
 * and source-position mapping so every error reports `{ line, col }`.
 *
 * Pass a `{ subdir, name, version }` ref to pin this engine to one contract
 * version. The document's `version` must match; the matching snapshot is
 * loaded and nothing else. Pass an absolute path (or path thunk) to validate
 * against a spec that lives outside this package — the pin check is skipped.
 */
export class SpecValidator {
  readonly #specRef: SpecRef | null;
  readonly #resolveFixedPath: SpecPathFn | null;
  readonly #compiled = new Map<string, ValidateFn>();

  constructor(specPath: SpecPathSource) {
    if (isSpecRef(specPath)) {
      this.#specRef = specPath;
      this.#resolveFixedPath = null;
    } else {
      this.#specRef = null;
      this.#resolveFixedPath =
        typeof specPath === "string" ? async () => specPath : specPath;
    }
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
    const resolved = await this.#resolvePath(data, doc, lineCounter);
    if ("errors" in resolved) return { valid: false, errors: resolved.errors };

    const validate = await this.#compiledSpec(resolved.path);
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

  async #resolvePath(
    data: unknown,
    doc: ReturnType<typeof parseYamlWithPositions>["doc"],
    lineCounter: ReturnType<typeof parseYamlWithPositions>["lineCounter"],
  ): Promise<{ path: string } | { errors: SpecValidationError[] }> {
    if (this.#resolveFixedPath) {
      return { path: await this.#resolveFixedPath() };
    }
    const ref = this.#specRef!;
    const parsed = parseSpecVersion(data);
    const { line, col } = positionFor(doc, lineCounter, "/version");
    if (!parsed.ok) {
      return {
        errors: [
          {
            line,
            col,
            instancePath: "/version",
            message: parsed.message,
          },
        ],
      };
    }
    if (parsed.version !== ref.version) {
      return {
        errors: [
          {
            line,
            col,
            instancePath: "/version",
            message: pinnedVersionMismatchMessage(ref.version),
          },
        ],
      };
    }
    try {
      const path = await resolveSpecPath(ref.subdir, ref.name, ref.version);
      return { path };
    } catch (err) {
      return {
        errors: [
          {
            line,
            col,
            instancePath: "/version",
            message: errorFromUnknown(err),
          },
        ],
      };
    }
  }

  async #compiledSpec(specPath: string): Promise<ValidateFn> {
    const hit = this.#compiled.get(specPath);
    if (hit) return hit;
    const specText = await readFile(specPath, "utf8");
    const schema = parseDocument(specText).toJS();
    const compiled = newAjv().compile(schema);
    this.#compiled.set(specPath, compiled);
    return compiled;
  }
}
