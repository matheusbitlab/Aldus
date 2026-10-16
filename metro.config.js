const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("wasm", "epub");

// Local archives contain copies of app/src and isolated test dependencies. They
// are not runtime sources and must not enter Metro's file map or module search.
const existingBlockList = config.resolver.blockList;
const projectRootPattern = __dirname.split(/[\\/]/)
  .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\\\/]");
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  /(?:^|[\\/])\.expo[\\/](?:eas-archive-[^\\/]+|saas-tools|saas-homologation|auth-test-tools|layout-test|redmi-qa|dev[\\/]logs)(?:[\\/]|$)/,
  // Gradle updates these directories while Metro runs. Expo's relative default
  // exclusions do not cover all absolute Windows/module build paths.
  /(?:^|[\\/])android[\\/](?:build|\.gradle|\.cxx|\.kotlin|app[\\/]build)(?:[\\/]|$)/,
  /(?:^|[\\/])\.browser-[^\\/]+(?:[\\/]|$)/,
  // Only this project's export/delivery archives, never dependency runtime folders.
  new RegExp("^(?:" + projectRootPattern + "[\\\\/]|\\.[\\\\/])?(?:dist|artifacts)(?:[\\\\/]|$)"),
];

module.exports = config;
