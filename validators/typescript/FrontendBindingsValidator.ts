import { SpecValidator } from "./src/SpecValidator.ts";
import { CURRENT_VERSION } from "./src/specVersion.ts";

export class FrontendBindingsValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "frontend",
      name: "bindings.spec.yaml",
      version: CURRENT_VERSION,
    });
  }
}
