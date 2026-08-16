import { SpecValidator } from "../SpecValidator.ts";
import { LIVE_VERSION } from "../specVersion.ts";
import { DatasourceSeedsValidator } from "./DatasourceSeedsValidator.ts";
import { DatasourceTypesValidator } from "./DatasourceTypesValidator.ts";

const pinned = SpecValidator.pinnedEngines(LIVE_VERSION);

export { DatasourceTypesValidator };
export { DatasourceSeedsValidator };
export const ViewTypesValidator = pinned.ViewTypesValidator;
export const RoutesValidator = pinned.RoutesValidator;
export const ServicesValidator = pinned.ServicesValidator;
export const FrontendBindingsValidator = pinned.FrontendBindingsValidator;
