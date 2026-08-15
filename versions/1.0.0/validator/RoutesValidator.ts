import { SpecValidator } from "../../../validators/typescript/src/SpecValidator.ts";
export class RoutesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "routes.spec.yaml",
      version: "1.0.0",
    });
  }
}
