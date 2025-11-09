/**
 * StylIQ Metro Config — React Native 0.82 / Xcode 16
 * ✅ Monorepo support (e.g. apps/frontend)
 * ✅ Fixes “module not found” & “Property 'require' doesn’t exist”
 * ✅ Adds .glb support for react-native-filament
 */

const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, 'apps/frontend');

const defaultConfig = getDefaultConfig(projectRoot);
const {resolver, transformer} = defaultConfig;

module.exports = mergeConfig(defaultConfig, {
  projectRoot,

  // 👀 watch both the root and the frontend workspace
  watchFolders: [workspaceRoot, path.resolve(projectRoot, 'node_modules')],

  resolver: {
    ...resolver,

    /**
     * ✅ Core fix — make sure modules in /node_modules resolve
     *    even when imports come from /apps/frontend
     */
    extraNodeModules: new Proxy(
      {},
      {
        get: (target, name) => path.join(projectRoot, 'node_modules', name),
      },
    ),

    unstable_conditionNames: ['require'],
    unstable_enablePackageExports: false,

    // ✅ Add support for 3D model files used by Filament
    assetExts: [...resolver.assetExts, 'glb'],

    sourceExts: resolver.sourceExts,
  },

  transformer: {
    ...transformer,
    experimentalImportSupport: false,
    inlineRequires: false,
  },

  // 🧠 performance optimization for M-series Macs
  maxWorkers: 2,
});

//////////////////////

// /**
//  * StylIQ Metro Config — React Native 0.82 / Xcode 16
//  * ✅ Fixes “module not found” for monorepos (e.g. apps/frontend)
//  * ✅ Fixes “Property 'require' doesn’t exist”
//  */

// const path = require('path');
// const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// const projectRoot = __dirname;
// const workspaceRoot = path.resolve(projectRoot, 'apps/frontend');

// const defaultConfig = getDefaultConfig(projectRoot);
// const {resolver, transformer} = defaultConfig;

// module.exports = mergeConfig(defaultConfig, {
//   projectRoot,
//   // 👀 watch both the root and frontend workspace
//   watchFolders: [workspaceRoot, path.resolve(projectRoot, 'node_modules')],

//   resolver: {
//     ...resolver,

//     /**
//      * ✅ Core fix — make sure modules in /node_modules resolve
//      *    even when imports come from /apps/frontend
//      */
//     extraNodeModules: new Proxy(
//       {},
//       {
//         get: (target, name) => path.join(projectRoot, 'node_modules', name),
//       },
//     ),

//     unstable_conditionNames: ['require'],
//     unstable_enablePackageExports: false,
//     assetExts: resolver.assetExts,
//     sourceExts: resolver.sourceExts,
//   },

//   transformer: {
//     ...transformer,
//     experimentalImportSupport: false,
//     inlineRequires: false,
//   },

//   // 🧠 performance optimization for M-series Macs
//   maxWorkers: 2,
// });
