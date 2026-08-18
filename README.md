# deterministic-specifications

The canonical YAML contract for the [deterministic](https://github.com/rmcfadden/deterministic) code generator. Files under [`backend/`](./backend) and [`frontend/`](./frontend) named `*.spec.yaml` are strict [JSON Schema](https://json-schema.org/) (draft 2020-12, authored in YAML) that define the shape of one authored `deterministic/*.yaml` file. [`backend/types.yaml`](backend/types.yaml) is the language-agnostic field-type catalog (default-value tokens and numeric ranges), not a schema.

## The specs

| Spec | Governs | Purpose |
| --- | --- | --- |
| [`backend/datasource-types.spec.yaml`](backend/datasource-types.spec.yaml) | `datasource_types.yaml` | The physical data model — tables, fields, indexes, FKs. |
| [`backend/types.yaml`](backend/types.yaml) | field `default_value` tokens and ranges | Language-agnostic field-type catalog. Shape locked by [`backend/types.spec.yaml`](backend/types.spec.yaml). |
| [`backend/datasource-seeds.spec.yaml`](backend/datasource-seeds.spec.yaml) | `datasource_seeds.yaml` | Seed rows for datasource tables. Validated against `datasource_types.yaml`. |
| [`backend/view-types.spec.yaml`](backend/view-types.spec.yaml) | `view_types.yaml` | View shapes composed from datasource tables and other views. |
| [`backend/routes.spec.yaml`](backend/routes.spec.yaml) | `routes.yaml` | The HTTP route surface. |
| [`backend/services.spec.yaml`](backend/services.spec.yaml) | `services.yaml` | Service classes resolved via DI at app bootstrap. |
| [`backend/app.spec.yaml`](backend/app.spec.yaml) | `backend-app.yaml` | Express app bootstrap — middleware, statics, tail handlers. |
| [`frontend/bindings.spec.yaml`](frontend/bindings.spec.yaml) | `frontend_bindings.yaml` | External datasources a frontend binds to (REST/GraphQL). |

## TypeScript parser

[`validators/typescript`](./validators/typescript) also ships `SpecificationParser`: a typed walk of `datasource_types.yaml`, `view_types.yaml`, `services.yaml`, and `routes.yaml` that returns strict objects (resolved FK types, view pass-throughs, nested routes). Consume it from `@deterministic-code/deterministic-specifications`:

```ts
import { SpecificationParser, memoryReader } from "@deterministic-code/deterministic-specifications";

const spec = await new SpecificationParser(memoryReader(files)).load({
  idType: "integer",
});
```

## Samples

Kitchen-sink documents under [`samples/valid/`](samples/valid) exercise every property, enum, const, oneOf branch, and pattern in the live specs. [`samples/invalid/`](samples/invalid) holds one document per independently observable schema constraint; together they must fail `validate()`. Both suites live in `validators/typescript/test/samples.integration.test.ts`.

Readable apps live under [`examples/`](examples): [`examples/minimal/`](examples/minimal) (required keys only) and [`examples/tasks/`](examples/tasks) (a small user/project/task contract). [`examples/errors/`](examples/errors) is a human-curated gallery of typical authoring mistakes — one per file — not the exhaustive mutant dump.

## Conventions

- Every authored document must declare a `version` semver (today: `1.0.0`). Unknown keys are rejected (`additionalProperties: false`) so typos fail loudly rather than being silently ignored.
- Shared identifier patterns (`^[a-z_][a-z0-9_]*$`), the `file:`/`id:`/`uuid:`/`user_id+name` include machinery, and the `combine_options` merge transforms recur across several specs.
- Schema shape is only the first gate; several specs pair with a semantic layer (cross-document reference checks, merged-settings validation) in the consuming generator.

## Versioning

The live contract is **1.0.0**. It lives at the repo root as three sibling folders:

```
backend/                               # live specs
frontend/
validators/typescript/src/validators/  # live engines + tests
```

Every authored `deterministic/*.yaml` document must declare an exact semver. There is no floating alias:

```yaml
version: 1.0.0
```

- **`1.0.0`** (the live version) binds to the root specs and the live [`validators/typescript/src/validators/`](./validators/typescript/src/validators) engines.
- **Any other published semver** binds to [`versions/<semver>/`](./versions), which contains `backend/`, `frontend/`, and `validators/engines.ts`. After a bump, `1.0.0` falls back to that archive if the live tree is gone.

Validators require `version` and pin to it: a `1.0.0` engine rejects any other value. A missing or non-semver `version` is a validation error before an engine is loaded.

Root spec files start with `version: 1.0.0`. Each frozen copy is stamped with `version: <semver>` and a versioned `$id`. Each frozen engine is pinned to that semver.

Archive a new version by moving the live specs and engine file:

```sh
npm run bump-version -- 1.1.0
```

That relocates `backend/`, `frontend/`, and `validators/typescript/src/validators/engines.ts` into `versions/1.1.0/`, stamps the specs, and rewrites the engine so it stays pinned to `1.1.0`. Live tests stay at repo root and keep covering every archived version. After a bump, set `LIVE_VERSION` to the next unpublished semver when re-authoring the live tree. Bumps are infrequent and take an explicit semver — no auto-increment.

The TypeScript validator suite enumerates every folder under `versions/` and fails if any published version is missing specs or `validators/engines.ts`.

These are contract files: adding a field, key, `x-` extension, or op annotation is a deliberate contract change. Freeze a new semver before changing the live specs so existing documents stay valid against their pinned snapshot.
