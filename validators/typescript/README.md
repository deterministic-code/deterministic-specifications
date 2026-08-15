# @deterministic-code/deterministic-specifications

Strict TypeScript validators for the deterministic YAML contract. One validator
per spec, all sharing a common `SpecValidator` base class that carries the
engine — AJV (draft 2020-12) compilation, `oneOf` error collapsing, and
source-position mapping so every error reports `{ line, col }`.

```ts
import { DatasourceTypesValidator } from "@deterministic-code/deterministic-specifications";

const validator = new DatasourceTypesValidator();

const fromText = await validator.validate(yamlString);
const fromFile = await validator.validateFile("deterministic/datasource_types.yaml");

// { valid: boolean, errors: [{ line, col, instancePath, message }] }
```

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

Construct `SpecValidator` directly with an absolute path to validate against a
spec that lives outside this package.

This package validates **schema shape** only. Cross-document and semantic rules
(foreign-key resolution, defaults, type constraints) are layered on top by the
consumer.
