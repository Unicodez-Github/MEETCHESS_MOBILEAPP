import { memo, useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRecoilValue } from 'recoil';
import { AcademyState, SessnState, UserState } from '../../state';
import { Progress } from '../../factory';
import { apiCall } from '../../firebase';
import dayjs from 'dayjs';

const Jitsi = () => {
  const user = useRecoilValue(UserState);
  const sessn = useRecoilValue(SessnState);
  const academy = useRecoilValue(AcademyState);
  const [progress, setProgress] = useState(false);
  const [uri, setUrl] = useState(`https://mchess-connect.netlify.app?rom=${sessn?.id}&adm=${user?.role !== 'G' ? 1 : 0}&dis=${user?.name}&amd=${academy?.disableAudioMute ? 1 : 0}`);

  const loadData = useCallback(async() => {
    if (sessn?.createdBy === user.id) {
      const jwt = sessn?.jwt || (await apiCall({type: 'JWT', room: sessn?.id, sub: 'connect.meetchess.com', exp: dayjs().add(1, 'M').unix(), user: {name: user.name}})).data;
      setUrl(e => `${e}&jwt=${jwt}`);
    } setProgress(false);
  }, []);

  // useEffect(() => {
  //   loadData();
  // }, []);

  return <View style={{height: 400}}>
    {progress ? <Progress /> : <WebView useWebView2 originWhitelist={['*']} overScrollMode='never'
                allowsInlineMediaPlayback style={{height: '100%'}} source={{uri}} />}
  </View>;
};

export default memo(Jitsi);
