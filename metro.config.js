// metro.config.js
const { getDefaultConfig } = require('metro-config');
const path = require('path');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();

  return {
    projectRoot: __dirname,
    watchFolders: [path.resolve(__dirname)],
    resolver: {
      assetExts,
      sourceExts,
    },
    maxWorkers: 1,
  };
})();

/////////

// // metro.config.js
// const { getDefaultConfig } = require('metro-config');

// module.exports = (async () => {
//   const defaultConfig = await getDefaultConfig();

//   return {
//     ...defaultConfig,
//     maxWorkers: 1, // Prevent overwhelming file handles
//     watchFolders: [__dirname],
//   };
// })();
