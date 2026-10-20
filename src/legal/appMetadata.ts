import Constants from "expo-constants";
import appConfig from "../../app.json";

export function getAppMetadata() {
  const version = Constants.expoConfig?.version || appConfig.expo.version;
  const nativeBuild = Constants.nativeBuildVersion;
  const configuredBuild = Constants.expoConfig?.android?.versionCode ?? appConfig.expo.android.versionCode;
  const build = nativeBuild || (configuredBuild ? String(configuredBuild) : "não informado");
  return { version, build };
}
