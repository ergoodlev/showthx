// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Properly EXTEND the blockList (don't replace it!)
// This excludes the trigger folder which is a separate Node.js project for Trigger.dev
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /trigger\/.*/,
];

module.exports = config;
