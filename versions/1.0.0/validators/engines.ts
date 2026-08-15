import { SpecValidator } from "../../../validators/typescript/src/SpecValidator.ts";

export const {
  DatasourceTypesValidator,
  ViewTypesValidator,
  RoutesValidator,
  ServicesValidator,
  FrontendBindingsValidator,
} = SpecValidator.pinnedEngines("1.0.0");
