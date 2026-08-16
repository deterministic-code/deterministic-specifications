import { asRecord } from "./yamlPositions.ts";

export const CURRENT_VERSION = "CURRENT";

export const VALIDATOR_ENGINES = [
  ["DatasourceTypesValidator", "backend", "datasource-types.spec.yaml"],
  ["DatasourceSeedsValidator", "backend", "datasource-seeds.spec.yaml"],
  ["ViewTypesValidator", "backend", "view-types.spec.yaml"],
  ["RoutesValidator", "backend", "routes.spec.yaml"],
  ["ServicesValidator", "backend", "services.spec.yaml"],
  ["FrontendBindingsValidator", "frontend", "bindings.spec.yaml"],
] as const;

export type EngineName = (typeof VALIDATOR_ENGINES)[number][0];

export type EngineDef = {
  className: EngineName;
  subdir: string;
  name: string;
};

export function mapEngines<T>(fn: (engine: EngineDef) => T): Record<EngineName, T> {
  return Object.fromEntries(
    VALIDATOR_ENGINES.map(([className, subdir, name]) => [
      className,
      fn({ className, subdir, name }),
    ]),
  ) as Record<EngineName, T>;
}

export const SPEC_FILES = [
  ...VALIDATOR_ENGINES.map(([, subdir, name]) => ({ subdir, name })),
  { subdir: "backend", name: "app.spec.yaml" },
  { subdir: "backend", name: "types.spec.yaml" },
];

export const VALIDATOR_ENGINE_FILE = "engines.ts";

export type SpecRef = {
  subdir: string;
  name: string;
  version: string;
};

export type ParseSpecVersionResult =
  | { ok: true; version: string }
  | { ok: false; message: string };

const PUBLISHED_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export function isPublishedVersion(value: string): boolean {
  return PUBLISHED_VERSION.test(value);
}

export function isSpecVersion(value: string): boolean {
  return value === CURRENT_VERSION || isPublishedVersion(value);
}

export function isSpecRef(value: unknown): value is SpecRef {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.subdir === "string" &&
    typeof rec.name === "string" &&
    typeof rec.version === "string"
  );
}

export function parseSpecVersion(data: unknown): ParseSpecVersionResult {
  const rec = asRecord(data);
  if (!rec || Array.isArray(data)) {
    return {
      ok: false,
      message: "document must be a mapping with a version field",
    };
  }
  if (!("version" in rec)) {
    return {
      ok: false,
      message:
        "missing required property version (set CURRENT to track the live specs, or a published semver such as 1.0.0)",
    };
  }
  const version = rec.version;
  if (typeof version !== "string" || !isSpecVersion(version)) {
    return {
      ok: false,
      message: "version must be CURRENT or a semver (e.g. 1.0.0)",
    };
  }
  return { ok: true, version };
}
