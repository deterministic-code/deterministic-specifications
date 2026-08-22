// src/SpecValidator.ts
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument as parseDocument2 } from "yaml";

// src/yamlPositions.ts
import {
  parseDocument,
  LineCounter,
  isMap,
  isSeq,
  isScalar,
  isPair
} from "yaml";
function asRecord(value) {
  return value && typeof value === "object" ? value : null;
}
function parseYamlWithPositions(yamlText) {
  const lineCounter = new LineCounter();
  const doc = parseDocument(yamlText, { lineCounter, keepSourceTokens: true });
  return { doc, lineCounter };
}
function parseJsonPointer(pointer) {
  if (!pointer || pointer === "") return [];
  return pointer.split("/").slice(1).map((seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~"));
}
function nodeAtPath(doc, segments) {
  let node = doc.contents;
  for (const seg of segments) {
    if (node == null) return null;
    if (isMap(node)) {
      const pair = node.items.find((p) => {
        const key = isScalar(p.key) ? p.key.value : p.key;
        return String(key) === seg;
      });
      if (!pair) return node;
      node = pair.value;
    } else if (isSeq(node)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx) || idx < 0 || idx >= node.items.length)
        return node;
      node = node.items[idx];
    } else {
      return node;
    }
  }
  return node;
}
function rangeOfNode(node) {
  if (node == null) return null;
  const ranged = (v) => asRecord(v)?.range ?? null;
  if (isPair(node)) return ranged(node.key) ?? ranged(node.value);
  return ranged(node);
}
function positionFor(doc, lineCounter, instancePath) {
  const segments = parseJsonPointer(instancePath);
  const node = nodeAtPath(doc, segments);
  const range = rangeOfNode(node);
  const offset = range ? range[0] : 0;
  const { line, col } = lineCounter.linePos(offset);
  return { line, col };
}

// src/resolveSpecPath.ts
import { access, readdir } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

// src/specVersion.ts
var LIVE_VERSION = "1.0.0";
var VALIDATOR_ENGINES = [
  ["DatasourceTypesValidator", "backend", "datasource-types.spec.yaml"],
  ["DatasourceSeedsValidator", "backend", "datasource-seeds.spec.yaml"],
  ["ViewTypesValidator", "backend", "view-types.spec.yaml"],
  ["RoutesValidator", "backend", "routes.spec.yaml"],
  ["RoutesApiValidator", "backend", "routes-api.spec.yaml"],
  ["ServicesValidator", "backend", "services.spec.yaml"],
  ["FrontendBindingsValidator", "frontend", "bindings.spec.yaml"]
];
function mapEngines(fn) {
  return Object.fromEntries(
    VALIDATOR_ENGINES.map(([className, subdir, name]) => [
      className,
      fn({ className, subdir, name })
    ])
  );
}
var SPEC_FILES = [
  ...VALIDATOR_ENGINES.map(([, subdir, name]) => ({ subdir, name })),
  { subdir: "backend", name: "app.spec.yaml" },
  { subdir: "backend", name: "types.spec.yaml" }
];
var VALIDATOR_ENGINE_FILE = "engines.js";
var SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
function isPublishedVersion(value) {
  return SEMVER.test(value);
}
function isSpecVersion(value) {
  return isPublishedVersion(value);
}
function isLiveVersion(value) {
  return value === LIVE_VERSION;
}
function isSpecRef(value) {
  if (!value || typeof value !== "object") return false;
  const rec = value;
  return typeof rec.subdir === "string" && typeof rec.name === "string" && typeof rec.version === "string";
}
function parseSpecVersion(data) {
  const rec = asRecord(data);
  if (!rec || Array.isArray(data)) {
    return {
      ok: false,
      message: "document must be a mapping with a version field"
    };
  }
  if (!("version" in rec)) {
    return {
      ok: false,
      message: "missing required property version (set a semver such as 1.0.0)"
    };
  }
  const version = rec.version;
  if (typeof version !== "string" || !isSpecVersion(version)) {
    return {
      ok: false,
      message: "version must be a semver (e.g. 1.0.0)"
    };
  }
  return { ok: true, version };
}

// src/resolveSpecPath.ts
async function fileExists(path) {
  return access(path).then(
    () => true,
    () => false
  );
}
async function findAncestorPath(relPath, start) {
  let current = start ?? dirname(fileURLToPath(import.meta.url));
  const { root } = parse(current);
  for (; ; ) {
    const candidate = join(current, relPath);
    if (await fileExists(candidate)) return candidate;
    if (current === root) return null;
    current = dirname(current);
  }
}
function specRelPath(subdir, name, version) {
  return isLiveVersion(version) ? join(subdir, name) : join("versions", version, subdir, name);
}
function archiveSpecRelPath(subdir, name, version) {
  return join("versions", version, subdir, name);
}
async function findSpecPath(subdir, name, version, start) {
  if (isLiveVersion(version)) {
    const live = await findAncestorPath(join(subdir, name), start);
    if (live !== null) return live;
  }
  return findAncestorPath(archiveSpecRelPath(subdir, name, version), start);
}
async function listPublishedVersions(start) {
  const dir = await findAncestorPath("versions", start);
  if (dir === null) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && isPublishedVersion(e.name)).map((e) => e.name).sort();
}
async function listSpecVersions(start) {
  const published = await listPublishedVersions(start);
  return [LIVE_VERSION, ...published.filter((v) => v !== LIVE_VERSION)];
}
async function assertKnownVersion(version, start) {
  if (isLiveVersion(version)) return;
  const published = await listPublishedVersions(start);
  if (published.includes(version)) return;
  const hint = published.length ? published.join(", ") : "none";
  throw new Error(`unknown spec version: ${version} (published: ${hint})`);
}
async function resolveExisting(found, version, missing, start) {
  if (found !== null) return found;
  await assertKnownVersion(version, start);
  throw new Error(missing);
}
async function resolveSpecPath(subdir, name, version, start) {
  return resolveExisting(
    await findSpecPath(subdir, name, version, start),
    version,
    `spec file not found: ${specRelPath(subdir, name, version)}`,
    start
  );
}
function engineRelPath(version) {
  return isLiveVersion(version) ? join("validators", "typescript", "src", "validators") : join("versions", version, "validators");
}
var LIVE_ENGINE_FILE = join(
  "validators",
  "typescript",
  "src",
  "validators",
  VALIDATOR_ENGINE_FILE
);
async function findEngineDir(version, start) {
  if (isLiveVersion(version)) {
    const engineFile = await findAncestorPath(LIVE_ENGINE_FILE, start);
    if (engineFile !== null) return dirname(engineFile);
  }
  return findAncestorPath(join("versions", version, "validators"), start);
}
async function resolveEngineDir(version, start) {
  return resolveExisting(
    await findEngineDir(version, start),
    version,
    `validator engine not found: ${engineRelPath(version)}`,
    start
  );
}
async function resolveEngineModulePath(version, start) {
  const js = join(await resolveEngineDir(version, start), VALIDATOR_ENGINE_FILE);
  if (process.env.VITEST) {
    const ts = js.replace(/\.js$/, ".ts");
    if (await fileExists(ts)) return ts;
  }
  return js;
}

// src/SpecValidator.ts
function yamlErrorOffset(pos) {
  return pos ? pos[0] : 0;
}
function yamlParseErrors(doc, lineCounter) {
  return doc.errors.map((e) => {
    const { line, col } = lineCounter.linePos(yamlErrorOffset(e.pos));
    return { line, col, instancePath: "", message: e.message };
  });
}
function specError(doc, lineCounter, instancePath, message) {
  const { line, col } = positionFor(doc, lineCounter, instancePath);
  return { line, col, instancePath, message };
}
function versionFail(doc, lineCounter, message) {
  return {
    valid: false,
    errors: [specError(doc, lineCounter, "/version", message)]
  };
}
function readYaml(text) {
  const { doc, lineCounter } = parseYamlWithPositions(text);
  return {
    doc,
    lineCounter,
    errors: yamlParseErrors(doc, lineCounter),
    data: doc.toJS()
  };
}
function resolveAjvCtor(mod) {
  const withDefault = mod;
  return withDefault.default ?? mod;
}
function newAjv() {
  return new (resolveAjvCtor(Ajv2020))({ allErrors: true, strict: false });
}
var AJV_PARAM_SUFFIX = [
  ["additionalProperty", (v) => `(property: ${String(v)})`],
  ["missingProperty", (v) => `(missing: ${String(v)})`],
  ["allowedValues", (v) => `(allowed: ${v.join(", ")})`]
];
function ajvParamSuffix(params) {
  if (!params) return "";
  for (const [key, fmt] of AJV_PARAM_SUFFIX) {
    if (params[key]) return ` ${fmt(params[key])}`;
  }
  return "";
}
function formatAjvError(e) {
  const where = e.instancePath || "(root)";
  return `${where} ${e.message}${ajvParamSuffix(e.params)}`;
}
function errorFromUnknown(err) {
  return err instanceof Error ? err.message : String(err);
}
var FileValidator = class {
  async validate(text, options) {
    const { doc, lineCounter, errors, data } = readYaml(text);
    if (errors.length > 0) return { valid: false, errors };
    return this.check({ doc, lineCounter, data }, text, options);
  }
  async optionsForFile(_path, options) {
    return options;
  }
  async validateFile(path, options) {
    return this.validate(
      await readFile(path, "utf8"),
      await this.optionsForFile(path, options)
    );
  }
};
var SpecValidator = class _SpecValidator extends FileValidator {
  #specRef;
  #resolveFixedPath;
  #compiled = /* @__PURE__ */ new Map();
  constructor(specPath) {
    super();
    if (isSpecRef(specPath)) {
      this.#specRef = specPath;
      this.#resolveFixedPath = null;
    } else {
      this.#specRef = null;
      this.#resolveFixedPath = typeof specPath === "string" ? async () => specPath : specPath;
    }
  }
  async check({ doc, lineCounter, data }, _text, _options) {
    const resolved = await this.#resolvePath(data, doc, lineCounter);
    if (!("path" in resolved)) return resolved;
    const validate = await this.#compiledSpec(resolved.path);
    if (validate(data)) return { valid: true, errors: [] };
    return {
      valid: false,
      errors: validate.errors.map(
        (e) => specError(doc, lineCounter, e.instancePath, formatAjvError(e))
      )
    };
  }
  async #resolvePath(data, doc, lineCounter) {
    if (this.#resolveFixedPath) {
      return { path: await this.#resolveFixedPath() };
    }
    const ref = this.#specRef;
    const parsed = parseSpecVersion(data);
    if (!parsed.ok) return versionFail(doc, lineCounter, parsed.message);
    if (parsed.version !== ref.version) {
      return versionFail(
        doc,
        lineCounter,
        `version must be ${ref.version} (this engine is pinned to ${ref.version})`
      );
    }
    try {
      return {
        path: await resolveSpecPath(ref.subdir, ref.name, ref.version)
      };
    } catch (err) {
      return versionFail(doc, lineCounter, errorFromUnknown(err));
    }
  }
  static pinned(ref) {
    return class extends _SpecValidator {
      constructor() {
        super(ref);
      }
    };
  }
  static pinnedEngines(version) {
    return mapEngines(
      ({ subdir, name }) => _SpecValidator.pinned({ subdir, name, version })
    );
  }
  async #compiledSpec(specPath) {
    const hit = this.#compiled.get(specPath);
    if (hit) return hit;
    const specText = await readFile(specPath, "utf8");
    const compiled = newAjv().compile(parseDocument2(specText).toJS());
    this.#compiled.set(specPath, compiled);
    return compiled;
  }
};

// src/VersionedValidator.ts
import { pathToFileURL } from "node:url";

// src/seedSemantics.ts
import { readFile as readFile2 } from "node:fs/promises";
import { dirname as dirname2, join as join2 } from "node:path";
async function withSiblingDatasourceTypes(seedsPath, options) {
  if (options?.datasourceTypes !== void 0) return { ...options };
  if (options?.datasourceTypesPath) {
    return {
      ...options,
      datasourceTypes: await readFile2(options.datasourceTypesPath, "utf8")
    };
  }
  const sibling = join2(dirname2(seedsPath), "datasource_types.yaml");
  try {
    return { ...options, datasourceTypes: await readFile2(sibling, "utf8") };
  } catch {
    return { ...options };
  }
}

// src/includeSemantics.ts
import { basename, dirname as dirname3, join as join3, relative, resolve } from "node:path";
function withIncludeFilePath(path, options) {
  return {
    ...options,
    includeFilePath: options?.includeFilePath ?? path,
    includeBasePath: options?.includeBasePath ?? dirname3(path)
  };
}

// src/VersionedValidator.ts
function engineConstructor(mod, exportName) {
  const Ctor = mod[exportName];
  if (typeof Ctor !== "function") {
    throw new Error(
      `validator engine missing export ${exportName} in ${VALIDATOR_ENGINE_FILE}`
    );
  }
  return Ctor;
}
async function loadEngine(exportName, version) {
  const href = pathToFileURL(await resolveEngineModulePath(version)).href;
  return new (engineConstructor(
    await import(href),
    exportName
  ))();
}
var VersionedValidator = class extends FileValidator {
  #exportName;
  constructor(exportName) {
    super();
    this.#exportName = exportName;
  }
  async check({ doc, lineCounter, data }, text, options) {
    const parsed = parseSpecVersion(data);
    if (!parsed.ok) return versionFail(doc, lineCounter, parsed.message);
    try {
      return (await loadEngine(this.#exportName, parsed.version)).validate(
        text,
        options
      );
    } catch (err) {
      return versionFail(doc, lineCounter, errorFromUnknown(err));
    }
  }
};
var DatasourceTypesValidator = class extends VersionedValidator {
  constructor() {
    super("DatasourceTypesValidator");
  }
  async optionsForFile(path, options) {
    return withIncludeFilePath(path, options);
  }
};
var ViewTypesValidator = class extends VersionedValidator {
  constructor() {
    super("ViewTypesValidator");
  }
  async optionsForFile(path, options) {
    return withIncludeFilePath(path, options);
  }
};
var RoutesValidator = class extends VersionedValidator {
  constructor() {
    super("RoutesValidator");
  }
  async optionsForFile(path, options) {
    return withIncludeFilePath(path, options);
  }
};
var RoutesApiValidator = class extends VersionedValidator {
  constructor() {
    super("RoutesApiValidator");
  }
};
var ServicesValidator = class extends VersionedValidator {
  constructor() {
    super("ServicesValidator");
  }
  async optionsForFile(path, options) {
    return withIncludeFilePath(path, options);
  }
};
var FrontendBindingsValidator = class extends VersionedValidator {
  constructor() {
    super("FrontendBindingsValidator");
  }
};
var DatasourceSeedsValidator = class extends VersionedValidator {
  constructor() {
    super("DatasourceSeedsValidator");
  }
  async optionsForFile(path, options) {
    return withSiblingDatasourceTypes(path, options);
  }
};
export {
  DatasourceSeedsValidator,
  DatasourceTypesValidator,
  FrontendBindingsValidator,
  LIVE_VERSION,
  RoutesApiValidator,
  RoutesValidator,
  SPEC_FILES,
  ServicesValidator,
  SpecValidator,
  VALIDATOR_ENGINES,
  VALIDATOR_ENGINE_FILE,
  VersionedValidator,
  ViewTypesValidator,
  engineRelPath,
  findAncestorPath,
  findEngineDir,
  findSpecPath,
  isLiveVersion,
  isPublishedVersion,
  isSpecRef,
  isSpecVersion,
  listPublishedVersions,
  listSpecVersions,
  mapEngines,
  parseSpecVersion,
  parseYamlWithPositions,
  positionFor,
  resolveEngineDir,
  resolveEngineModulePath,
  resolveSpecPath,
  specRelPath
};
