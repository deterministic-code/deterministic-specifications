import { SpecValidator } from "../validators/typescript/src/SpecValidator.ts";
import { CURRENT_VERSION } from "../validators/typescript/src/specVersion.ts";

export class FrontendBindingsValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "frontend",
      name: "bindings.spec.yaml",
      version: CURRENT_VERSION,
    });
  }
}
