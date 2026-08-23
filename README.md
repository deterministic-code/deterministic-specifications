# deterministic-specifications

The canonical YAML contract for the [deterministic](https://github.com/rmcfadden/deterministic) code generator. Files under [`backend/`](./backend) and [`frontend/`](./frontend) named `*.spec.yaml` are strict [JSON Schema](https://json-schema.org/) (draft 2020-12, authored in YAML) that define the shape of one authored `deterministic/*.yaml` file. [`backend/types.yaml`](backend/types.yaml) is the language-agnostic field-type catalog (default-value tokens and numeric ranges), not a schema.

## The specs

| Spec | Governs | Purpose |
| --- | --- | --- |
| [`backend/types.spec.yaml`](backend/types.spec.yaml) | `types.yaml` | Language-agnostic type system — one `types:` array; `tags` distinguish datasource_type / view_type / other kinds. |
| [`backend/field-types.spec.yaml`](backend/field-types.spec.yaml) | [`backend/types.yaml`](backend/types.yaml) | Primitive field-type catalog (default-value tokens and ranges). |
| [`backend/datasource.spec.yaml`](backend/datasource.spec.yaml) | `datasource.yaml` | Physical / migration concerns — table/column mappings, uniqueness, identity, indexes. |
| [`backend/datasource-seeds.spec.yaml`](backend/datasource-seeds.spec.yaml) | `datasource_seeds.yaml` | Seed rows for datasource tables. Validated against `types.yaml` + `datasource.yaml`. |
| [`backend/routes.spec.yaml`](backend/routes.spec.yaml) | `routes.yaml` | The authored HTTP route surface. |
| [`backend/routes-api.spec.yaml`](backend/routes-api.spec.yaml) | routes-api IR | Flattened API catalog from `expandRoutes` (OpenAPI / GraphQL / proto source). |
| [`backend/services.spec.yaml`](backend/services.spec.yaml) | `services.yaml` | Service classes resolved via DI at app bootstrap. |
| [`backend/app.spec.yaml`](backend/app.spec.yaml) | `backend-app.yaml` | Express app bootstrap — middleware, statics, tail handlers. |
| [`frontend/bindings.spec.yaml`](frontend/bindings.spec.yaml) | `frontend_bindings.yaml` | External datasources a frontend binds to (REST/GraphQL). |

## Samples

Kitchen-sink documents under [`samples/valid/`](samples/valid) exercise every property, enum, const, oneOf branch, and pattern in the live specs. [`samples/invalid/`](samples/invalid) holds one document per independently observable schema constraint; together they must fail `validate()`. Both suites live in [deterministic-specifications-typescript](https://github.com/deterministic-code/deterministic-specifications-typescript).

Readable apps live under [`examples/`](examples): [`examples/minimal/`](examples/minimal) (required keys only) and [`examples/tasks/`](examples/tasks) (a small user/project/task contract). [`examples/errors/`](examples/errors) is a human-curated gallery of typical authoring mistakes — one per file — not the exhaustive mutant dump.

## Conventions

- Every authored document must declare a `version` semver (today: `1.0.0`). Unknown keys are rejected (`additionalProperties: false`) so typos fail loudly rather than being silently ignored.
- Shared identifier patterns (`^[a-z_][a-z0-9_]*$`), the `file:`/`id:`/`uuid:`/`user_id+name` include machinery, and the `combine_options` merge transforms recur across several specs.
- Includes of types use `types: { filter }` with a shared tag-filter grammar (`type`, `tag`, `inherits`).
- Schema shape is only the first gate; several specs pair with a semantic layer (cross-document reference checks, merged-settings validation) in the consuming generator.

## Versioning

The live contract is **1.0.0**. It lives at the repo root as two sibling folders:

```
backend/    # live specs
frontend/
```

Every authored `deterministic/*.yaml` document must declare an exact semver. There is no floating alias:

```yaml
version: 1.0.0
```

- **`1.0.0`** (the live version) binds to the root specs.
- **Any other published semver** binds to [`versions/<semver>/`](./versions), which contains `backend/` and `frontend/`. After a bump, `1.0.0` falls back to that archive if the live tree is gone.

TypeScript validators live in [deterministic-specifications-typescript](https://github.com/deterministic-code/deterministic-specifications-typescript). They require `version` and pin to it: a `1.0.0` engine rejects any other value. A missing or non-semver `version` is a validation error before an engine is loaded.

Root spec files start with `version: 1.0.0`. Each frozen copy is stamped with `version: <semver>` and a versioned `$id`.

Archive a new version by moving the live specs:

```sh
npm run bump-version -- 1.1.0
```

That relocates `backend/` and `frontend/` into `versions/1.1.0/` and stamps the specs. After a bump, set `LIVE_VERSION` in the TypeScript validators to the next unpublished semver when re-authoring the live tree. Bumps are infrequent and take an explicit semver — no auto-increment.

These are contract files: adding a field, key, `x-` extension, or op annotation is a deliberate contract change. Freeze a new semver before changing the live specs so existing documents stay valid against their pinned snapshot.
