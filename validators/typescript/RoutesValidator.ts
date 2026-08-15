import { SpecValidator } from "./src/SpecValidator.ts";
import { CURRENT_VERSION } from "./src/specVersion.ts";

export class RoutesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "routes.spec.yaml",
      version: CURRENT_VERSION,
    });
  }
}
