import { memo } from 'react';
import { KeyboardAvoidingView, Text, TextInput, View } from 'react-native';
import { useRecoilValue } from 'recoil';
import { UserState } from '../../state';
import s from '../../style';

const Chat = ({messages=[]}) => {
  const user = useRecoilValue(UserState);
  return (
    <View style={{margin: 8}}>
      {[...messages].reverse().map((e, i) => <View key={i} style={{...s.mb8, flexDirection: e.user === user?.id ? 'row' : 'row-reverse', alignSelf: e.user === user?.id ? 'flex-start' : 'flex-end'}}>
        <View style={{
          width: 0,
          height: 0,
          marginTop: 12,
          borderTopWidth: e.user === user?.id ? 8 : 4,
          borderBottomWidth: e.user === user?.id ? 4 : 8,
          borderRightWidth: e.user === user?.id ? 9 : 0,
          borderLeftWidth: e.user === user?.id ? 0 : 9,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderRightColor: '#F0F8FF',
          borderLeftColor: '#ADD8E6'
        }} />
        <View style={{...s.px8, ...s.br8, paddingTop: 4, paddingBottom: 6, backgroundColor: e.user === user?.id ? '#F0F8FF' : '#ADD8E6'}}>
          <Text>{e.user === user?.id ? 'You' : e.name}</Text>
          <Text style={{...s.mt4}}>
            {e.message}
          </Text>
        </View>
      </View>)}
    </View>
  );
};

export default memo(Chat);