import { SpecValidator } from "../SpecValidator.ts";
import { resolveSpecPath } from "../resolve-spec-path.ts";

export class DatasourceTypesValidator extends SpecValidator {
  constructor() {
    super(() => resolveSpecPath("backend", "datasource-types.spec.yaml"));
  }
}
