import { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, AntDesign } from '@expo/vector-icons';
import s from '../../style';

const tools = (role='G', active=[]) => [{
  id: 'NEW', hide: role === 'G',
  icon: <MaterialCommunityIcons name='checkerboard' color='#87CEFA' size={24} />
}, {
  id: 'COR', hide: role === 'G',
  icon: <MaterialIcons name='text-rotation-none' color={active.includes('COR') ? '#90EE90' : '#87CEFA'} size={26} />
}, {
//   id: 'HLT', hide: role === 'G',
//   icon: <MaterialCommunityIcons name='square-outline' color={active.includes('HLT') ? '#90EE90' : '#87CEFA'} size={25} />
// }, {
  id: 'ARW', hide: role === 'G',
  icon: <MaterialCommunityIcons name='arrow-expand-all' color={active.includes('ARW') ? '#90EE90' : '#87CEFA'} size={25} />
}, {
  id: 'FLP',
  icon: <MaterialCommunityIcons name='rotate-3d-variant' color='#87CEFA' size={26} />
}, {
  id: 'PWN', hide: role === 'G',
  icon: <MaterialCommunityIcons name='chess-pawn' color={active.includes('PWN') ? '#90EE90' : '#87CEFA'} size={26} />
}, {
  id: 'HDE', hide: role === 'G',
  icon: <MaterialCommunityIcons name='eye-off-outline' color={active.includes('HDE') ? '#90EE90' : '#87CEFA'} size={26} />
}, {
  id: 'POS', hide: role === 'G',
  icon: <MaterialIcons name='app-registration' color='#87CEFA' size={26} />
}, {
  id: 'PGN', hide: role === 'G', hide: true,
  icon: <MaterialCommunityIcons name='clipboard-edit-outline' color='#87CEFA' size={24} />
}, {
  id: 'SLM', hide: role === 'G',
  icon: <MaterialIcons name='call-split' color={active.includes('SLM') ? '#90EE90' : '#87CEFA'} size={26} />
}, {
    id: 'SET', hide: role === 'G',
    icon: <MaterialIcons name='settings' color='#87CEFA' size={25} />
  }, {
  id: 'AIM', hide: role === 'G',
  icon: <MaterialIcons name='do-not-disturb' color={active.includes('AIM') ? '#90EE90' : '#87CEFA'} size={25} />
}, {
//   id: 'PUZ', hide: role === 'G',
//   icon: <MaterialCommunityIcons name='puzzle-outline' color='#87CEFA' size={24} />
// }, {
  id: 'FST', hide: role === 'G',
  icon: <MaterialIcons name='fast-rewind' color='#87CEFA' size={26} />
}, {
  id: 'PRE', hide: role === 'G',
  icon: <MaterialIcons name='skip-previous' color='#87CEFA' size={26} />
}, {
  id: 'NXT', hide: role === 'G',
  icon: <MaterialIcons name='skip-next' color='#87CEFA' size={26} />
}, {
  id: 'LST', hide: role === 'G',
  icon: <MaterialIcons name='fast-forward' color='#87CEFA' size={26} />
}, {
  id: 'ASK', hide: role === 'G',
  icon: <Ionicons name='help' color='#87CEFA' size={28} />
}, {
  id: 'ADU', hide: role === 'G',
  icon: <AntDesign name='adduser' color='#87CEFA' size={24} />
}, {
  id: 'CLR', hide: role === 'G',
  icon: <MaterialIcons name='clear' color='#87CEFA' size={26} />
}, {
  id: 'UND', hide: role === 'G',
  icon: <MaterialIcons name='replay' color='#87CEFA' size={26} />
}, {
  id: 'CUR', hide: role === 'G',
  icon: <MaterialIcons name='local-library' color='#87CEFA' size={26} />
}].filter(e => e && !e.hide);

const Tool = ({role='G', active=[], onPress=()=>{}}) => (
  <View style={{...s.fdr, ...s.fww, ...s.jcc, ...s.p8, ...s.g8}}>
    {tools(role, active).map(({id, icon}) => <TouchableOpacity key={id} style={{...s.aic, ...s.jcc, ...s.br5, ...s.bc3, height: 30, width: 30}} onPress={() => onPress(id)}>
      {icon}
    </TouchableOpacity>)}
  </View>
);

export default memo(Tool);
