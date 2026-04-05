const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for .mjs and .cjs extensions natively 
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = config;
