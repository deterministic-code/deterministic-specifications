import { SpecValidator } from "../SpecValidator.ts";
import { resolveSpecPath } from "../resolve-spec-path.ts";

export class ServicesValidator extends SpecValidator {
  constructor() {
    super(() => resolveSpecPath("backend", "services.spec.yaml"));
  }
}
