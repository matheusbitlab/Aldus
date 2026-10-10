import Constants from "expo-constants";

export function getAppMetadata() {
  const version = Constants.expoConfig?.version || "não informada";
  const nativeBuild = Constants.nativeBuildVersion;
  const configuredBuild = Constants.expoConfig?.android?.versionCode;
  const build = nativeBuild || (configuredBuild ? String(configuredBuild) : "não informado");
  return { version, build };
}
