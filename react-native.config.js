// // react-native.config.js
// module.exports = {
//   project: {
//     android: {
//       packageName: 'com.yourprojectname', // <-- CHANGE THIS to your package name (e.g., com.styliQ)
//     },
//   },
//   assets: ['./src/assets/fonts/'], // Optional: Add other project-specific config
// };

//////////////

// const path = require('path');

// module.exports = {
//   reactNativePath: path.resolve(__dirname, 'node_modules/react-native'),

//   project: {
//     android: {
//       sourceDir: './android',
//       // 👇 must match AndroidManifest.xml package exactly
//       packageName: 'com.styliq',
//     },
//   },
// };

///////////////////

const path = require('path');

module.exports = {
  reactNativePath: path.resolve(__dirname, 'node_modules/react-native'),
};
