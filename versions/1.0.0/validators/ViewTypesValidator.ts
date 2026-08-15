import { SpecValidator } from "../../../validators/typescript/src/SpecValidator.ts";
export class ViewTypesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "view-types.spec.yaml",
      version: "1.0.0",
    });
  }
}
