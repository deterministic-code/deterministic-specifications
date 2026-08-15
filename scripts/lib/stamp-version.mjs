const LIVE_ENGINE_IMPORT = 'from "../validators/typescript/src/';
const FROZEN_ENGINE_IMPORT = 'from "../../../validators/typescript/src/';
const ID_PREFIX = "https://cali-services.local/schemas/deterministic/";

export function stampSpecText(text, semver) {
  return text
    .replace(/^version: CURRENT$/m, `version: ${semver}`)
    .replaceAll(`$id: ${ID_PREFIX}`, `$id: ${ID_PREFIX}versions/${semver}/`);
}

export function stampValidatorText(text, semver) {
  let out = text.replaceAll(LIVE_ENGINE_IMPORT, FROZEN_ENGINE_IMPORT);
  out = out.replace(/import \{ CURRENT_VERSION \} from "[^"]+";\n\n/g, "");
  out = out.replaceAll("version: CURRENT_VERSION", `version: "${semver}"`);
  out = out.replaceAll(
    `VALID.replace("CURRENT", "${semver}")`,
    `VALID.replace("${semver}", "CURRENT")`,
  );
  out = out.replaceAll("pinned to CURRENT", `pinned to ${semver}`);
  out = out.replaceAll("version: CURRENT", `version: ${semver}`);
  out = out.replaceAll(`describe("CURRENT `, `describe("${semver} `);
  return out;
}
