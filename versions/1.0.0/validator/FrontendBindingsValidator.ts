import { SpecValidator } from "../../../validators/typescript/src/SpecValidator.ts";
export class FrontendBindingsValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "frontend",
      name: "bindings.spec.yaml",
      version: "1.0.0",
    });
  }
}
