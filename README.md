# deterministic-specifications

The canonical YAML contract for the [deterministic](https://github.com/rmcfadden/deterministic) code generator. Each file under [`backend/`](./backend) and [`frontend/`](./frontend) is a strict [JSON Schema](https://json-schema.org/) (draft 2020-12, authored in YAML) that defines the shape of one authored `deterministic/*.yaml` file — the source of truth consumers author against and emitters read.

## The specs

| Spec | Governs | Purpose |
| --- | --- | --- |
| [`backend/datasource-types.spec.yaml`](backend/datasource-types.spec.yaml) | `datasource_types.yaml` | The physical data model — tables, fields, indexes, seeds, FKs. |
| [`backend/view-types.spec.yaml`](backend/view-types.spec.yaml) | `view_types.yaml` | View shapes composed from datasource tables and other views. |
| [`backend/routes.spec.yaml`](backend/routes.spec.yaml) | `routes.yaml` | The HTTP route surface. |
| [`backend/services.spec.yaml`](backend/services.spec.yaml) | `services.yaml` | Service classes resolved via DI at app bootstrap. |
| [`backend/app.spec.yaml`](backend/app.spec.yaml) | `backend-app.yaml` | Express app bootstrap — middleware, statics, tail handlers. |
| [`frontend/bindings.spec.yaml`](frontend/bindings.spec.yaml) | `frontend_bindings.yaml` | External datasources a frontend binds to (REST/GraphQL). |

## Conventions

- Every authored document must declare `version: CURRENT` or a published semver. Unknown keys are rejected (`additionalProperties: false`) so typos fail loudly rather than being silently ignored.
- Shared identifier patterns (`^[a-z_][a-z0-9_]*$`), the `file:`/`id:`/`uuid:`/`user_id+name` include machinery, and the `combine_options` merge transforms recur across several specs.
- Schema shape is only the first gate; several specs pair with a semantic layer (cross-document reference checks, merged-settings validation) in the consuming generator.

## Versioning

CURRENT lives at the repo root as three sibling folders:

```
backend/                  # live specs
frontend/
validators/typescript/     # live engines + tests, plus the shared package
```

Every authored `deterministic/*.yaml` document must declare a `version`:

```yaml
version: CURRENT   # live root specs and validators/typescript/ — may change without notice
# or
version: 1.0.0     # frozen archive under versions/1.0.0/
```

- **`CURRENT`** binds to the live specs and the live [`validators/typescript/`](./validators/typescript) engines. Use this only when you want to track the moving contract (reckless).
- **A published semver** binds to [`versions/<semver>/`](./versions), which contains `backend/`, `frontend/`, and `validators/` (engine **and frozen tests**). Those tests keep running as proof that version is still supported.

Root spec files start with `version: CURRENT`. Each frozen copy is stamped with `version: <semver>` and a versioned `$id`. Each frozen engine is pinned to that semver and rejects documents that declare any other version.

Archive a new version by moving the live specs and engine files:

```sh
npm run bump-version -- 1.1.0
```

That relocates `backend/`, `frontend/`, and the engine files in `validators/typescript/` into `versions/1.1.0/`, stamps the specs, and rewrites the engine + tests so they stay pinned to `1.1.0`. The rest of the TypeScript package (`src/`, `package.json`, …) stays at repo root. After a bump, the next CURRENT is authored again in `validators/typescript/`. Bumps are infrequent and take an explicit semver — no auto-increment.

The TypeScript validator suite enumerates every folder under `versions/` and fails if any published version is missing specs, an engine, or `validators/validator.test.ts`.

These are contract files: adding a field, key, `x-` extension, or op annotation is a deliberate contract change. Freeze a new semver before changing CURRENT so existing documents stay valid against their pinned snapshot.
