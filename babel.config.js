module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: './apps/frontend/.env',
        blocklist: null,
        allowlist: null,
        safe: false,
        allowUndefined: true,
      },
    ],
    ['@babel/plugin-transform-private-methods', {loose: true}],
    ['@babel/plugin-transform-class-properties', {loose: true}],
    ['@babel/plugin-transform-private-property-in-object', {loose: true}],
  ],
};

///////////////

// module.exports = {
//   presets: ['module:metro-react-native-babel-preset'],
//   plugins: [
//     'module:react-native-dotenv',
//     ['@babel/plugin-transform-private-methods', {loose: true}],
//     ['@babel/plugin-transform-class-properties', {loose: true}],
//     ['@babel/plugin-transform-private-property-in-object', {loose: true}],
//   ],
// };

/////////

// module.exports = {
//   presets: ['module:metro-react-native-babel-preset'],
//   plugins: ['module:react-native-dotenv'],
// };
