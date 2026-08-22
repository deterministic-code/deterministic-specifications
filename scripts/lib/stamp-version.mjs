const ID_PREFIX = "https://cali-services.local/schemas/deterministic/";

export function stampSpecText(text, semver) {
  return text
    .replace(/^version: [0-9]+\.[0-9]+\.[0-9]+$/m, `version: ${semver}`)
    .replaceAll(`$id: ${ID_PREFIX}`, `$id: ${ID_PREFIX}versions/${semver}/`);
}
