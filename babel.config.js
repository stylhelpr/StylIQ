module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-proposal-export-namespace-from',
    ['react-native-reanimated/plugin', {processNestedWorklets: true}],
  ],
};

///////////////////

// module.exports = {
//   presets: ['module:@react-native/babel-preset'],
//   plugins: [
//     '@babel/plugin-proposal-export-namespace-from',
//     'react-native-worklets/plugin',
//   ],
// };
