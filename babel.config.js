module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
<<<<<<< HEAD
  plugins: ['module:react-native-dotenv'],
=======
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: './.env',
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
>>>>>>> 9-22-25-chore-mg3
};
