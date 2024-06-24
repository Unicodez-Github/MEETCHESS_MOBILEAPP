import { FlatList, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon, Text } from 'react-native-paper'
import { getData, getDataByField, parseDate } from '../../service'
import { Button, Chip, Date, Empty, Header, Level, Progress } from '../../factory'
import { pageSize } from '../../constant'
import { UserState } from '../../state'
import dayjs from 'dayjs'
import Live from './live'
import s from '../../style'

const getQuery = ({id = null, role = null, academy = null}, from, to, status = [1]) => {
  const field = ['C', 'D'].includes(role) ? 'academy' : role === 'G' ? 'participants' : 'coaches'
  const match = field === 'academy' ? '==' : 'array-contains'
  const filter = [[field, match, field === 'academy' ? academy : id], ['status', 'in', status]]
  from && to && filter.push(['start', '>=', from], ['start', '<=', to])
  return ['tournaments', filter, [['start', (status.includes(1) || status.includes(2)) ? 'asc' : 'desc']]]
}

export default function Tournament() {
  const user = useRecoilValue(UserState)
  const lastDoc = useRef(null)
  const hasMore = useRef(false)
  const [progress, setProgress] = useState(true)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [live, setLive] = useState(null)

  const onLiveClose = (reload) => {
    loadData()
    setLive(null)
  }

  const loadMore = useCallback(async() => {
    if (!(hasMore.current && lastDoc.current)) return;
    setLoading(true)
    const docs = await getData(...getQuery(user, null, null, [1, 2]), [lastDoc.current.start])
    docs.forEach(e => e.d = parseDate(e.start))
    lastDoc.current = docs.at(-1)
    hasMore.current = docs.length === pageSize
    setDocs(d => [...d, ...docs])
    setLoading(false)
  }, [])

  const loadData = useCallback(async() => {
    setProgress(true)
    const docs = await getData(...getQuery(user, null, null, [1, 2]))
    docs.forEach(e => e.d = parseDate(e.start))    
    lastDoc.current = docs.at(-1);
    hasMore.current = docs.length === pageSize
    setDocs(docs)
    setProgress(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  if (live) return <Live docId={live.id} onClose={onLiveClose} />

  return (
    <View style={{...s.f1, ...s.bc2}}>
      {progress ? <Progress /> : <>
        <Header title='Tournament' icon={<Ionicons name='trophy-outline' size={25} color='#F50057' />} filter={false} />
        {docs?.length ? <FlatList
          data={docs}
          keyExtractor={item => item.id}
          onEndReached={!loading && loadMore}
          onEndReachedThreshold={0.01}
          ListFooterComponent={loading && <Progress />}
          style={s.p8}
          refreshing={false}
          onRefresh={loadData}
          ItemSeparatorComponent={() => <View style={{height: 8}} />}
          renderItem={({item}) => <View style={{...s.fdr, ...s.bc3, ...s.br8, ...s.p8, ...s.g8}}>
          <Date {...item.d} />
          <View style={{...s.f1, ...s.jcc, ...s.g8}}>
            <View style={{...s.fdr, ...s.aic, ...s.g4}}>
              <Text variant='bodyLarge' style={{...s.f1}}>{item.name}</Text>
            </View>
            <View style={{...s.fdr, ...s.aic, ...s.g4}}>
              <Icon source='radioactive-circle-outline' size={22} />
              <Text>{item.rounds}</Text>
              <Icon source='account-group' size={24} />
              <Text>{(item.participants || []).length}</Text>
            </View>
            <View style={{...s.fdr, ...s.aic, ...s.g4}}>
              {item.status === 1 && <Chip type={'play'} text={'Yet to start'} />}
              {item.status === 2 && <Chip type={'pause'} text={'In progress'} />}
              <View style={s.mla} />
              <Button title='JOIN' onPress={() => setLive(item)} />
            </View>
          </View>
        </View>}
        /> : <Empty />}
      </>}
    </View>
  )
}