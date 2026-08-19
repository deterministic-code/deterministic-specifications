import { SpecValidator } from "../../../validators/typescript/dist/index.js";
export const {
  DatasourceTypesValidator,
  DatasourceSeedsValidator,
  ViewTypesValidator,
  RoutesValidator,
  RoutesApiValidator,
  ServicesValidator,
  FrontendBindingsValidator,
} = SpecValidator.pinnedEngines("1.0.0");
