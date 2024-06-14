import { memo, useCallback, useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { View } from 'react-native'
import { AcademyState, SessnState, UserState } from '../../state'
import WebView from 'react-native-webview'

const JWT = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2RlcmF0b3IiOnRydWUsImNvbnRleHQiOnsidXNlciI6eyJuYW1lIjoiIn19LCJyb29tIjoiKiIsImlhdCI6MTcxODEwNzU3OSwiaXNzIjoidW5pY29kZXoiLCJhdWQiOiJqaXRzaSIsImV4cCI6MTc0OTY2NTE3OSwic3ViIjoiY29ubmVjdDIubWVldGNoZXNzLmNvbSJ9.P_s4B4-iwgcgpX6rjPZDwebidaJSPM5y2iR-wKTwcS0',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2RlcmF0b3IiOmZhbHNlLCJjb250ZXh0Ijp7InVzZXIiOnsibmFtZSI6IiJ9fSwicm9vbSI6IioiLCJpYXQiOjE3MTgxMDc1NzksImlzcyI6InVuaWNvZGV6IiwiYXVkIjoiaml0c2kiLCJleHAiOjE3NDk2NjUxNzksInN1YiI6ImNvbm5lY3QyLm1lZXRjaGVzcy5jb20ifQ.OC9a5upHOqpGLpq7qmWdoVphffwuP8moNC_orZrG9Rc'
]

// allow="autoplay; camera; clipboard-write; compute-pressure; display-capture; hid; microphone; screen-wake-lock; speaker-selection"

function Jitsi() {
  const user = useRecoilValue(UserState)
  const sessn = useRecoilValue(SessnState)
  const academy = useRecoilValue(AcademyState)
  const [uri, setUrl] = useState()

  const loadData = useCallback(() => {
    if (sessn?.id && user?.name && academy?.id) {
      const obj = {
        room: sessn.id,
        name: user.name,
        role: user.role,
        audio: academy?.disableAudioMute ? 2 : 1,
        jwt: JWT.at(sessn.createdBy === user.id ? 0 : 1)
      }
      setUrl(`https://mchess-jitsi.netlify.app?${Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('&')}`)
    }
  }, [user, sessn, academy])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <View style={{height: 200}}>
      {uri && <WebView useWebView2 originWhitelist={['*']} overScrollMode='never' allowsInlineMediaPlayback style={{height: '100%'}} source={{uri}} />}
    </View>
  )
}

export default memo(Jitsi)
