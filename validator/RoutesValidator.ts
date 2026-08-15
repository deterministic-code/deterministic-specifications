import { SpecValidator } from "../validators/typescript/src/SpecValidator.ts";
import { CURRENT_VERSION } from "../validators/typescript/src/specVersion.ts";

export class RoutesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "routes.spec.yaml",
      version: CURRENT_VERSION,
    });
  }
}
