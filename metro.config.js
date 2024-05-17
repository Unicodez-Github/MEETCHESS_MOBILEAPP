// const { getDefaultConfig } = require('@expo/metro-config')

// module.exports = (() => {
//   const config = getDefaultConfig(__dirname)
//   const { transformer, resolver } = config
//   config.transformer = {...transformer, babelTransformerPath: require.resolve('react-native-svg-transformer')}
//   config.resolver = {...resolver, assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'), sourceExts: [...resolver.sourceExts, 'svg', 'cjs']}
//   return config
// })()

const { getDefaultConfig } = require('@expo/metro-config')
const resolveFrom = require('resolve-from')
const config = getDefaultConfig(__dirname)
config.resolver.sourceExts.push('cjs')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('event-target-shim') && context.originModulePath.includes('react-native-webrtc')) {
    const eventTargetShimPath = resolveFrom(context.originModulePath, moduleName);
    return { filePath: eventTargetShimPath, type: 'sourceFile' };
  } return context.resolveRequest(context, moduleName, platform);
}
module.exports = config