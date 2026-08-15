# deterministic-specifications

The canonical YAML contract for the [deterministic](https://github.com/rmcfadden/deterministic) code generator. Each file in [`spec/`](./spec) is a strict [JSON Schema](https://json-schema.org/) (draft 2020-12, authored in YAML) that defines the shape of one authored `deterministic/*.yaml` file — the source of truth consumers author against and emitters read.

## The specs

| Spec | Governs | Purpose |
| --- | --- | --- |
| [`datasource-types.spec.yaml`](spec/datasource-types.spec.yaml) | `datasource_types.yaml` | The physical data model — tables, fields, indexes, seeds, FKs. |
| [`view-types.spec.yaml`](spec/view-types.spec.yaml) | `view_types.yaml` | View shapes composed from datasource tables and other views. |
| [`routes.spec.yaml`](spec/routes.spec.yaml) | `routes.yaml` | The HTTP route surface. |
| [`services.spec.yaml`](spec/services.spec.yaml) | `services.yaml` | Service classes resolved via DI at app bootstrap. |
| [`backend-app.spec.yaml`](spec/backend-app.spec.yaml) | `backend-app.yaml` | Express app bootstrap — middleware, statics, tail handlers. |
| [`frontend-bindings.spec.yaml`](spec/frontend-bindings.spec.yaml) | `frontend_bindings.yaml` | External datasources a frontend binds to (REST/GraphQL). |

## Conventions

- Every schema is `additionalProperties: false` — unknown keys are rejected so typos fail loudly rather than being silently ignored.
- Shared identifier patterns (`^[a-z_][a-z0-9_]*$`), the `file:`/`id:`/`uuid:`/`user_id+name` include machinery, and the `combine_options` merge transforms recur across several specs.
- Schema shape is only the first gate; several specs pair with a semantic layer (cross-document reference checks, merged-settings validation) in the consuming generator.

## Versioning

These are contract files: adding a field, key, `x-` extension, or op annotation is a deliberate contract change — every emitter that reads the spec must honor it. Treat changes here as breaking until every consumer is updated.
