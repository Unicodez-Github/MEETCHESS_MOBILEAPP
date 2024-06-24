import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, ToastAndroid, BackHandler } from 'react-native'
import { Icon, Portal, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SvgFromXml } from 'react-native-svg'
import { GestureDetector, Gesture, ScrollView } from 'react-native-gesture-handler'
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Game, fenToObj, objToFen, startFen } from '../../chess'
import { Button, Dragged, Piece } from '../../components'
import { getDocsByField } from '../../service'
import Fen from '../../fen';
import Move from '../../move';
import s from '../../style'
import { Empty, Progress } from '../../factory'

const FenView = memo(({fen = startFen, moves = []}) => {
  const game = useRef(new Game()).current
  const [move, setMove] = useState({f: fen, i: '_'})
  const [his, setMoves] = useState([])

  useEffect(() => {
    const result = game.load({fen, moves: JSON.parse(moves)})
    setMoves(result ? game.moves() : [])
  }, [])

  return (
    <>
      <Fen fen={move.f} orientation={fen.split(' ')[1]} />
      <Move moves={his} index={move.i} onMove={(ind) => setMove(game.selectMove(ind))} />
    </>
  );
});

export default function SessView({doc, onClose}) {
  const [progress, setProgress] = useState(false)
  const [docs, setDocs] = useState([])
  
  const loadData = useCallback(async() => {
    if (doc?.id) {
      setProgress(true)
      const data = await getDocsByField('games', [['database', '==', doc.id]])
      data.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds)
      setDocs(data)
    } setProgress(false)
  }, [doc])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    
    return () => backHandler.remove()
  }, [])

  return (
    <Portal>
      <SafeAreaView style={{...s.fg1, ...s.bc3}}>
        <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.p8, ...s.bc2, paddingLeft: 4}}>
          <MaterialIcons name='live-tv' color='#87CEFA' size={30} />
          <Text variant='titleLarge' style={s.mra}>{doc?.name}</Text>
          <Button text='close' onPress={onClose} icon={<Feather name='x' size={18} />} />
        </View>
        <ScrollView overScrollMode='never' style={s.f1}>
          {progress ? <Progress /> : docs?.length ? docs.map((e, i) => <FenView key={i} {...e} />) : <Empty />}
        </ScrollView>
      </SafeAreaView>
    </Portal>
  );
}
