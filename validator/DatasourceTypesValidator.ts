import { SpecValidator } from "../validators/typescript/src/SpecValidator.ts";
import { CURRENT_VERSION } from "../validators/typescript/src/specVersion.ts";

export class DatasourceTypesValidator extends SpecValidator {
  constructor() {
    super({
      subdir: "backend",
      name: "datasource-types.spec.yaml",
      version: CURRENT_VERSION,
    });
  }
}
