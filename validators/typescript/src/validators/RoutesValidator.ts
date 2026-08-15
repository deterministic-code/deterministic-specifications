import { SpecValidator } from "../SpecValidator.ts";
import { resolveSpecPath } from "../resolve-spec-path.ts";

export class RoutesValidator extends SpecValidator {
  constructor() {
    super(() => resolveSpecPath("backend", "routes.spec.yaml"));
  }
}
