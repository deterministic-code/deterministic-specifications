import { SpecValidator } from "../SpecValidator.ts";
import { CURRENT_VERSION } from "../specVersion.ts";

export const {
  DatasourceTypesValidator,
  ViewTypesValidator,
  RoutesValidator,
  ServicesValidator,
  FrontendBindingsValidator,
} = SpecValidator.pinnedEngines(CURRENT_VERSION);
