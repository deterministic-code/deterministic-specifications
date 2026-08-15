import { SpecValidator } from "../SpecValidator.ts";
import { resolveSpecPath } from "../resolve-spec-path.ts";

export class FrontendBindingsValidator extends SpecValidator {
  constructor() {
    super(() => resolveSpecPath("frontend", "bindings.spec.yaml"));
  }
}
