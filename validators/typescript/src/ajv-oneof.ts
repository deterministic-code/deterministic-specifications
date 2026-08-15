import Ajv2020 from "ajv/dist/2020.js";
import type { AjvError, AjvLike } from "./types.ts";
import { asRecord } from "./yaml-positions.ts";
import { parseJsonPointer } from "./yaml-positions.ts";

interface OneOfContext {
  root: unknown;
  defs: unknown;
  data: unknown;
  ajv: AjvLike;
}

interface OneOfFrame {
  branch: unknown;
  value: unknown;
}

type AjvCtorType = new (opts: unknown) => AjvLike;

export function newAjv(): AjvLike {
  const AjvCtor = ((Ajv2020 as { default?: AjvCtorType }).default ??
    Ajv2020) as AjvCtorType;
  return new AjvCtor({ allErrors: true, strict: false });
}

function isUnderPath(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

function rootOneOfPaths(errors: AjvError[]): string[] {
  const all = [
    ...new Set(
      errors.filter((e) => e.keyword === "oneOf").map((e) => e.instancePath),
    ),
  ];
  return all.filter((p) => !all.some((q) => q !== p && isUnderPath(p, q)));
}

/** Reduce each `oneOf` failure to its closest branch's errors, dropping the first-hit per root, preserving order. `expand(root)` supplies the replacement errors. */
function collapseByRoots(
  errors: AjvError[],
  roots: string[],
  expand: (root: string) => AjvError[],
): AjvError[] {
  const handled = new Set<string>();
  const out: AjvError[] = [];
  for (const e of errors) {
    const root = roots.find((r) => isUnderPath(e.instancePath, r));
    if (root == null) {
      out.push(e);
      continue;
    }
    if (handled.has(root)) continue;
    handled.add(root);
    out.push(...expand(root));
  }
  return out;
}

function nodeAtPointer(root: unknown, ref: string): unknown {
  let node: unknown = root;
  for (const seg of ref.replace(/^#\//, "").split("/")) {
    node = asRecord(node)?.[seg];
  }
  return node;
}

function derefSchema(node: unknown, root: unknown): unknown {
  let current = node;
  const seen = new Set<string>();
  let rec = asRecord(current);
  while (rec && typeof rec.$ref === "string" && !seen.has(rec.$ref)) {
    seen.add(rec.$ref);
    current = nodeAtPointer(root, rec.$ref);
    rec = asRecord(current);
  }
  return current;
}

/** Walk a schema from `node` down instance `segments` via `properties` / `items` / `additionalProperties` / `$ref` to the subschema governing that path. Null when a hop can't resolve (e.g. it crosses a nested `oneOf`). */
function schemaNodeForPath(
  node: unknown,
  segments: string[],
  root: unknown,
): unknown {
  let current = derefSchema(node, root);
  for (const seg of segments) {
    const rec = asRecord(current);
    if (!rec) return null;
    const props = asRecord(rec.properties);
    if (rec.items) current = rec.items;
    else if (props && seg in props) current = props[seg];
    else if (
      rec.additionalProperties &&
      typeof rec.additionalProperties === "object"
    )
      current = rec.additionalProperties;
    else return null;
    current = derefSchema(current, root);
  }
  return current;
}

function valueAtPath(value: unknown, segments: string[]): unknown {
  let current: unknown = value;
  for (const seg of segments) {
    if (current == null) return undefined;
    current = Array.isArray(current)
      ? current[Number(seg)]
      : (current as Record<string, unknown>)[seg];
  }
  return current;
}

/** Of a `oneOf`'s branches, the one that came closest to matching `value`: branches rejecting on a root-level type mismatch (the value isn't even that JSON type) rank last, then fewest rejections wins. `{ errs, branch }`, or null if every branch passed. */
function closestBranch(
  branches: unknown[],
  value: unknown,
  ctx: OneOfContext,
): { errs: AjvError[]; branch: unknown } | null {
  const cands: Array<{
    errs: AjvError[];
    branch: unknown;
    incompatible: number;
    count: number;
  }> = [];
  for (const branch of branches) {
    const check = ctx.ajv.compile({ allOf: [branch], $defs: ctx.defs });
    check(value);
    const errs = check.errors ?? [];
    if (errs.length === 0) continue;
    const incompatible = errs.some(
      (e) => e.keyword === "type" && e.instancePath === "",
    );
    cands.push({
      errs,
      branch,
      incompatible: incompatible ? 1 : 0,
      count: errs.length,
    });
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => a.incompatible - b.incompatible || a.count - b.count);
  return {
    errs: cands[0].errs,
    branch: derefSchema(cands[0].branch, ctx.root),
  };
}

function expandNested(
  nestedPath: string,
  frame: OneOfFrame,
  ctx: OneOfContext,
): AjvError[] {
  const segments = parseJsonPointer(nestedPath);
  const subNode = schemaNodeForPath(frame.branch, segments, ctx.root);
  if (!asRecord(subNode)?.oneOf) return [];
  const subValue = valueAtPath(frame.value, segments);
  return reduceOneOf(subNode, subValue, ctx).map((e) => ({
    ...e,
    instancePath: nestedPath + e.instancePath,
  }));
}

/** Reduce a failed `oneOf` at `node`/`value` to its closest branch's errors, recursing through any nested `oneOf` that branch itself trips. Errors are relative to `value`. */
function reduceOneOf(
  node: unknown,
  value: unknown,
  ctx: OneOfContext,
): AjvError[] {
  const oneOf = asRecord(node)?.oneOf as unknown[];
  const winner = closestBranch(oneOf, value, ctx);
  if (winner == null) return [];
  const nestedRoots = rootOneOfPaths(winner.errs);
  if (nestedRoots.length === 0) return winner.errs;
  return collapseByRoots(winner.errs, nestedRoots, (nested) =>
    expandNested(nested, { branch: winner.branch, value }, ctx),
  );
}

function collapseGroup(
  rootPath: string,
  ctx: OneOfContext,
  fallback: AjvError[],
): AjvError[] {
  const segments = parseJsonPointer(rootPath);
  const node = schemaNodeForPath(ctx.root, segments, ctx.root);
  if (!asRecord(node)?.oneOf)
    return fallback.filter((e) => e.keyword !== "oneOf");
  return reduceOneOf(node, valueAtPath(ctx.data, segments), ctx).map((e) => ({
    ...e,
    instancePath: rootPath + e.instancePath,
  }));
}

/** AJV with `allErrors` reports every `oneOf` branch's rejection plus the summary, so one malformed field yields dozens of lines. Re-validate the value against each branch, keep only the closest branch's errors (recursing through nested `oneOf`), and leave unrelated errors untouched. */
export function collapseOneOfErrors(
  errors: AjvError[],
  schema: unknown,
  data: unknown,
): AjvError[] {
  const roots = rootOneOfPaths(errors);
  if (roots.length === 0) return errors;
  const ctx: OneOfContext = {
    root: schema,
    defs: asRecord(schema)?.$defs ?? {},
    data,
    ajv: newAjv(),
  };
  const groups = new Map<string, AjvError[]>(roots.map((r) => [r, []]));
  for (const e of errors) {
    const root = roots.find((r) => isUnderPath(e.instancePath, r));
    if (root != null) groups.get(root)!.push(e);
  }
  return collapseByRoots(errors, roots, (root) =>
    collapseGroup(root, ctx, groups.get(root)!),
  );
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
