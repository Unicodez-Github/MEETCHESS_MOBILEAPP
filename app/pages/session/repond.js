import { View, useWindowDimensions } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { memo } from 'react';
import RenderHtml from 'react-native-render-html'
import s from '../../style'

function Respond({responds = []}) {
  const { width } = useWindowDimensions()

  return (
    <View style={{margin: 8}}>
      {[...responds].reverse().map((e, i) => <View key={i} style={{...s.fdr, ...s.aic, marginBottom: 12}}>
        <View style={{...s.p8, ...s.br5, backgroundColor: '#FFF', color: '#555'}}>
          <RenderHtml source={{html: e.message}} contentWidth={width} />
        </View>
        <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.p8}}>
          {e?.feedBack === 'YES' && <MaterialIcons name='thumb-up-alt' color='#FFC400' size={24} />}
          {e?.feedBack === 'NO' && <MaterialIcons name='thumb-down-alt' color='#FFC400' size={24} />}
        </View>
      </View>)}
    </View>
  )
}

export default memo(Respond)