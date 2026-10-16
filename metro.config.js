const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("wasm", "epub");

// Local archives contain copies of app/src and isolated test dependencies. They
// are not runtime sources and must not enter Metro's file map or module search.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  /[\\/]\.expo[\\/](?:eas-archive-[^\\/]+|saas-tools|saas-homologation|auth-test-tools|layout-test|redmi-qa)(?:[\\/]|$)/,
];

module.exports = config;
