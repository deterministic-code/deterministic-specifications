import { SpecValidator } from "../SpecValidator.ts";
import { resolveSpecPath } from "../resolve-spec-path.ts";

export class ViewTypesValidator extends SpecValidator {
  constructor() {
    super(() => resolveSpecPath("backend", "view-types.spec.yaml"));
  }
}
