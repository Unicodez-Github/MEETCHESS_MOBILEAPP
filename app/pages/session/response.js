import { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import s from '../../style';

const Response = ({responds=[], onResponse=()=>{}}) => {
  const sendFeedBack = (data, res) => {
    onResponse(responds.map(e => {
      const obj = { ...e };
      if (obj.user === data.user && obj.time === data.time) obj.feedBack = res;
      return obj;
    }));
  };

  return (
    <View style={{margin: 8}}>
      {[...responds].reverse().map((e, i) => <View key={i} style={{marginBottom: 12}}>
        <View style={{...s.fdr, ...s.aic}}>
          <Text style={{...s.p8, ...s.br5, backgroundColor: '#FFF', color: '#555'}}>{e.message}</Text>
          {e.feedBack ? <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.p8}}>
            {e.feedBack === 'YES' ? <MaterialIcons name='thumb-up-alt' color='#FFC400' size={24} /> : <MaterialIcons name='thumb-down-alt' color='#FFC400' size={24} />}
          </View> : <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.p8}}>
            <TouchableOpacity onPress={() => sendFeedBack(e, 'YES')}>
              <MaterialIcons name='thumb-up-off-alt' color='#FFC400' size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sendFeedBack(e, 'NO')}>
              <MaterialIcons name='thumb-down-off-alt' color='#FFC400' size={24} />
            </TouchableOpacity>
          </View>}
        </View>
        <Text style={s.cbbb}>{e.name}</Text>
      </View>)}
    </View>
  );
};

export default memo(Response);