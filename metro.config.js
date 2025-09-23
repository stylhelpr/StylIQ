<<<<<<< HEAD
// // metro.config.js
// const { getDefaultConfig } = require('metro-config');
// const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
// const path = require('path');

// const getConfig = async () => {
//   const {
//     resolver: { sourceExts, assetExts },
//   } = await getDefaultConfig();

//   return {
//     projectRoot: __dirname,
//     watchFolders: [path.resolve(__dirname)],
//     resolver: {
//       assetExts,
//       sourceExts,
//     },
//     maxWorkers: 1,
//   };
// };

// module.exports = wrapWithReanimatedMetroConfig(getConfig());

//////////

// metro.config.js
const { getDefaultConfig } = require('metro-config');
=======
// metro.config.js
const {getDefaultConfig} = require('metro-config');
>>>>>>> 9-22-25-chore-mg3
const path = require('path');

module.exports = (async () => {
  const {
<<<<<<< HEAD
    resolver: { sourceExts, assetExts },
=======
    resolver: {sourceExts, assetExts},
>>>>>>> 9-22-25-chore-mg3
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
<<<<<<< HEAD

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
=======
>>>>>>> 9-22-25-chore-mg3
