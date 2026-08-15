# @deterministic-code/deterministic-specifications

Shared TypeScript validation engine for the deterministic YAML contract. AJV
(draft 2020-12) compilation and source-position mapping live here so every
error reports `{ line, col }`. CURRENT engines live in this package;
frozen engines live under [`versions/<semver>/validators/`](../../versions).

```ts
import { DatasourceTypesValidator } from "@deterministic-code/deterministic-specifications";

const validator = new DatasourceTypesValidator();

const fromText = await validator.validate(yamlString);
const fromFile = await validator.validateFile("deterministic/datasource_types.yaml");

// { valid: boolean, errors: [{ line, col, instancePath, message }] }
```

The exported classes are facades: they read `version` from the document and
load that archive's engine. `CURRENT` uses this package; `1.0.0`
uses `versions/1.0.0/validators/`. An unknown version is a validation error.
Each engine is pinned — a CURRENT engine rejects `version: 1.0.0` and vice
versa.

Frozen tests under `versions/<semver>/validators/validator.test.ts` keep
running in CI. They are the proof that version is still supported.

## Validators

| Class                       | Contract file                  |
| --------------------------- | ------------------------------ |
| `DatasourceTypesValidator`  | `backend/datasource-types.spec.yaml` |
| `ViewTypesValidator`        | `backend/view-types.spec.yaml` |
| `RoutesValidator`           | `backend/routes.spec.yaml`     |
| `ServicesValidator`         | `backend/services.spec.yaml`   |
| `FrontendBindingsValidator` | `frontend/bindings.spec.yaml`  |

Each exposes two methods:

- `validate(text: string)` — validate an in-memory YAML string.
- `validateFile(path: string)` — read a file from disk, then validate it.

Construct `SpecValidator` with `{ subdir, name, version }` to pin an engine
to one snapshot, or with an absolute path to validate against a spec that
lives outside this package (the pin check is skipped).

Archive a new version (moves `backend/`, `frontend/`, and this package's engine files):

```sh
npm run bump-version -- 1.1.0
```

This package validates **schema shape** only. Cross-document and semantic rules
(foreign-key resolution, defaults, type constraints) are layered on top by the
consumer.
