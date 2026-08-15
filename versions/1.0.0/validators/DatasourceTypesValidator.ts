import { SpecValidator } from "../../../validators/typescript/src/SpecValidator.ts";
export class DatasourceTypesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "datasource-types.spec.yaml",
      version: "1.0.0",
    });
  }
}
