import { SpecValidator } from "../../../validators/typescript/src/SpecValidator.ts";
export class ServicesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "services.spec.yaml",
      version: "1.0.0",
    });
  }
}
