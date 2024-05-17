const { withAndroidManifest } = require('@expo/config-plugins')

module.exports = function service(config) {
  return withAndroidManifest(config, (config) => {
    const {manifest} = config.modResults
    if (Array.isArray(manifest['application'])) {
      const application = manifest['application'].find(item => item.$['android:name'] === '.MainApplication')
      if (application) {
        const notifee = {
          '$': {
            'android:name': 'app.notifee.core.ForegroundService',
            'android:foregroundServiceType': 'mediaProjection|camera|microphone'
          }
        }
        if (Array.isArray(application['service'])) {
          if (!application['service'].some(item => item.$['android:name'] === 'app.notifee.core.ForegroundService')) {
            application['service'].push(notifee)
          }
        } else {
          application['service'] = [notifee]
        }
      }
    } return config
  })
}