import { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import s from '../../style';

const Participant = ({participants=[], onControl=()=>{}}) => {
  return (
    <View style={{...s.m8, ...s.g8}}>
      {participants.map((e, i) => <View key={i} style={{...s.fdr, ...s.aic, ...s.bc3, ...s.p8, ...s.g8, ...s.br5}}>
        <FontAwesome name='circle' color={e.joined ? '#90EE90' : 'red'} />
        <Text style={s.cbbb} numberOfLines={1}>{e.name}</Text>
        <TouchableOpacity style={{...s.mla, ...s.aic, ...s.jcc, width: 32, height: 32, borderRadius: 16, borderColor: '#CCC', borderWidth: 1, backgroundColor: e.whiteCtrl ? 'green' : 'transparent'}} onPress={() => onControl({wctrl: e.whiteCtrl ? null : e.id })}>
          <FontAwesome5 name='chess-pawn' size={20} color='#BBB' />
        </TouchableOpacity>
        <TouchableOpacity style={{...s.aic, ...s.jcc, width: 32, height: 32, borderRadius: 16, borderColor: '#CCC', borderWidth: 1, backgroundColor: e.blackCtrl ? 'green' : 'transparent'}} onPress={() => onControl({bctrl: e.blackCtrl ? null : e.id })}>
          <FontAwesome5 name='chess-pawn' size={20} />
        </TouchableOpacity>
      </View>)}
    </View>
  );
};

export default memo(Participant);