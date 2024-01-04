module.exports = function(api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: ['import-glob'],
    env: {
      production: {
        plugins: ['react-native-paper/babel']
      }
    }
  }
}
