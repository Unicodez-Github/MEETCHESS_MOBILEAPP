// module.exports = function(api) {
//   api.cache(true)
//   return {
//     presets: ['babel-preset-expo'],
//     plugins: ['import-glob'],
//     env: {
//       production: {
//         plugins: ['react-native-paper/babel']
//       }
//     }
//   }
// }

module.exports = function(api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['babel-plugin-inline-import', {extensions: ['.svg']}],
      ['import-glob'],
      ['react-native-reanimated/plugin']
    ],
    env: {
      production: {
        plugins: ['react-native-paper/babel']
      }
    }
  }
}
