import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, FlatList, Modal, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRecoilValue } from 'recoil'
import { UserState } from '../../state'
import { getData, getDocsByField } from '../../service'
import { pageSize } from '../../constant'
import { Chip, Progress, Toast } from '../../factory'
import { Game } from '../../chess'
import { Fen } from '../chess'
import HTMLView from 'react-native-htmlview'
import Move from '../../move'
import s from '../../style'

const levels = [{
  id: '11', name: 'Beginner'
}, {
  id: '21', name: 'Intermediate'
}, {
  id: '31', name: 'Advanced'
}]

const groupBy = (docs = [], key = null) => {
  if (!key) return docs;
  return docs.reduce((a, c) => {
    a[c[key]] = a[c[key]] ?? [];
    a[c[key]].push(c);
    return a;
  }, {});
}

const getQuery = (user = null) => ['lessons', [(user.role === 'F' || user.role === 'G') ? ['users', 'array-contains', user.id] : ['academy', '==', user.academy], ['status', '==', 1]], [['level', 'asc'], ['order', 'asc']]]

const Exercise = memo(({order = '', fen = '', moves = '', height, onChange}) => {
  const game = useRef(new Game()).current
  const [move, setMove] = useState({f: fen, i: '_'})
  const [his, setMoves] = useState([])

  useEffect(() => {
    const result = game.load({fen, moves: JSON.parse(moves)})
    setMoves(result ? game.moves() : [])
  }, [])

  return (
    <View style={{backgroundColor: '#555', borderRadius: 8, padding: 8, gap: 8}}>
      <View style={{height: 24, width: 24, borderRadius: 12, backgroundColor: '#ccc', alignItems: 'center', justifyContent: 'center', alignSelf: 'center'}}>
        <Text>{order}</Text>
      </View>
      <View style={{height: height - 32}}>
        <Fen orientation={fen.split(' ')[1]} fen={move.f} />
      </View>
      <Move moves={his} index={move.i} onMove={(ind) => setMove(game.selectMove(ind))} />
      <View><Button title='load' onPress={() => onChange({fen: fen, moveIndex: '_', history: game.history()})} /></View>
    </View>
  )
})

export default function Curriculum({open, onChange, onClose}) {
  const dimns = useWindowDimensions()
  const height = useMemo(() => Math.min(dimns.width, dimns.height), [dimns.width, dimns.height])
  const user = useRecoilValue(UserState)
  const lastDoc = useRef(null)
  const hasMore = useRef(false)
  const [progress, setProgress] = useState(true)
  const [docs, setDocs] = useState([])
  const [doc, setDoc] = useState()
  const [loading, setLoading] = useState(false)

  const selectDoc = async(data) => {
    setProgress(true)
    const exercises = await getDocsByField('games', [['database', '==', data?.lesson || data.id]])
    exercises.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}))
    setDoc({...data, exercises})
    setProgress(false)
  }

  const loadMore = useCallback(async() => {
    if (!(hasMore.current && lastDoc.current)) return;
    setLoading(true)
    const docs = await getData(...getQuery(user), [lastDoc.current.level, lastDoc.current.order])
    lastDoc.current = docs.at(-1)
    hasMore.current = docs.length === pageSize
    setDocs(d => d.concat(docs))
    setLoading(false)
  }, [])

  const loadData = useCallback(async() => {
    setProgress(true)
    const docs = await getData(...getQuery(user))  
    lastDoc.current = docs.at(-1);
    hasMore.current = docs.length === pageSize
    setDocs(docs)
    setProgress(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  return (
    <Modal visible={open}>
      <View style={{...s.fdr, ...s.aic, ...s.p8, ...s.g8, ...s.bc2}}>
        <MaterialIcons name='local-library' size={30} color='#F50057' />
        <Text style={{...s.cfff, ...s.mra, fontSize: 18}}>Curriculum</Text>
        {doc && <Button title='back' color='red' onPress={() => setDoc()} />}
        <Button title='close' onPress={onClose} />
      </View>
      {progress ? <Progress /> : doc ? <ScrollView style={{...s.p8}}>
        <HTMLView value={doc?.text || ''} />
        {doc?.exercises?.length && <View style={{gap: 8, marginTop: 8}}>
          <Text numberOfLines={1} style={{fontSize: 16, fontWeight: 700}}>Exercises ({doc.exercises.length})</Text>
          <View style={{gap: 8}}>
            {doc.exercises.map((e, i) => <Exercise key={e.id} order={i+1} {...e} height={height} onChange={onChange} />)}
          </View>
        </View>}
      </ScrollView> : <FlatList
        data={Object.entries(groupBy(docs, 'level')).map(([key, val]) => ({id: levels.find(e => e.id === key)?.name, data: val}))}
        keyExtractor={item => item.id}
        onEndReached={!loading && loadMore}
        onEndReachedThreshold={0.01}
        ListFooterComponent={loading && <Progress />}
        style={s.p8}
        refreshing={false}
        onRefresh={loadData}
        ItemSeparatorComponent={() => <View style={{height: 8}} />}
        renderItem={({item}) => <View>
          <Text numberOfLines={1} style={{fontSize: 16, fontWeight: 700}}>{item.id}</Text>
          <View style={{gap: 8, marginTop: 8}}>
            {item.data.map((e, i) => <View key={e.id} style={{...s.fdr, ...s.aic, ...s.br5, ...s.p6, ...s.g8, backgroundColor: '#CCC'}}>
              <Text numberOfLines={1}>{i + 1}. {e.topic}</Text>
              <View style={{marginLeft: 'auto'}} />
              <Button title='view' onPress={() => selectDoc(e)} color='#555' />
            </View>)}
          </View>
        </View>}
      />}
    </Modal>
  )
}