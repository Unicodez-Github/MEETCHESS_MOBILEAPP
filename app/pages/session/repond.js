import { MaterialIcons } from '@expo/vector-icons'
import { View, Text } from 'react-native'
import { memo } from 'react'
import HTMLView from 'react-native-htmlview'
import s from '../../style'

function Respond({responds = []}) {
  return (
    <View style={{margin: 8}}>
      {[...responds].reverse().map((e, i) => <View key={i} style={{...s.fdr, ...s.aic, marginBottom: 12}}>
        <View style={{...s.p8, ...s.br5, backgroundColor: '#FFF', color: '#555'}}>
          <HTMLView value={e.message} />
        </View>
        <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.p8}}>
          {e?.feedBack === 'YES' ? <MaterialIcons name='thumb-up-alt' color='#FFC400' size={24} /> : e?.feedBack === 'NO' ? <MaterialIcons name='thumb-down-alt' color='#FFC400' size={24} /> : <Text style={s.cfff}>{e?.feedBack}</Text>}
        </View>
      </View>)}
    </View>
  )
}

export default memo(Respond)