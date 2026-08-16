const LIVE_ENGINE_IMPORT = 'from "../';
const FROZEN_ENGINE_IMPORT = 'from "../../../validators/typescript/src/';
const ID_PREFIX = "https://cali-services.local/schemas/deterministic/";

export function stampSpecText(text, semver) {
  return text
    .replace(/^version: [0-9]+\.[0-9]+\.[0-9]+$/m, `version: ${semver}`)
    .replaceAll(`$id: ${ID_PREFIX}`, `$id: ${ID_PREFIX}versions/${semver}/`);
}

export function stampValidatorText(text, semver) {
  return text
    .replaceAll(LIVE_ENGINE_IMPORT, FROZEN_ENGINE_IMPORT)
    .replace(/import \{ LIVE_VERSION \} from "[^"]+";\n\n/g, "")
    .replaceAll("LIVE_VERSION", `"${semver}"`);
}
