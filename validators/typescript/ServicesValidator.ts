import { SpecValidator } from "./src/SpecValidator.ts";
import { CURRENT_VERSION } from "./src/specVersion.ts";

export class ServicesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "services.spec.yaml",
      version: CURRENT_VERSION,
    });
  }
}
