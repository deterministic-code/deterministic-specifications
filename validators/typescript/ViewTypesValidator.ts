import { SpecValidator } from "./src/SpecValidator.ts";
import { CURRENT_VERSION } from "./src/specVersion.ts";

export class ViewTypesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "view-types.spec.yaml",
      version: CURRENT_VERSION,
    });
  }
}
