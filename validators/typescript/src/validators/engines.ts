import { SpecValidator } from "../SpecValidator.ts";
import { CURRENT_VERSION } from "../specVersion.ts";
import { DatasourceSeedsValidator } from "./DatasourceSeedsValidator.ts";

const pinned = SpecValidator.pinnedEngines(CURRENT_VERSION);

export const DatasourceTypesValidator = pinned.DatasourceTypesValidator;
export { DatasourceSeedsValidator };
export const ViewTypesValidator = pinned.ViewTypesValidator;
export const RoutesValidator = pinned.RoutesValidator;
export const ServicesValidator = pinned.ServicesValidator;
export const FrontendBindingsValidator = pinned.FrontendBindingsValidator;
