import { FlatList, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import { MaterialIcons } from '@expo/vector-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon, Text } from 'react-native-paper'
import { getData, getDataByField, parseDate } from '../../service'
import { Button, Chip, Date, Empty, Header, Level, Progress } from '../../factory'
import { pageSize } from '../../constant'
import { UserState } from '../../state'
import dayjs from 'dayjs'
import Solve from './solve'
import s from '../../style'

const getQuery = ({id = null, role = null, from = null, to = null}) => {
  const filter = role === 'G' ? [['students', 'array-contains', id]] : [['createdBy', '==', id]];
  filter.push(['status', '==', 'A']);
  if (from) filter.push(['start', '>=', from]);
  if (to) filter.push(['start', '<=', to]);
  return ['assignments', filter, [['start', 'desc']]];
}

export default function Assignment() {
  const selected = useRef()
  const user = useRecoilValue(UserState)
  const lastDoc = useRef(null)
  const hasMore = useRef(false)
  const [progress, setProgress] = useState(true)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [solve, setSolve] = useState(null)

  const onSolveClose = (reload) => {
    selected.current = solve?.id
    loadData()
    setSolve(null)
  }

  const getAssignments = async(data) => {
    const reports = await getDataByField('reports', user.id, 'report', [...new Set((data || []).map(e => e.id))])
    data.forEach(e => {
      e.d = parseDate(e.start)
      const report = (reports || []).find(r => e && e.id && r && r.report && r.report === e.id)
      if (report) {
        e.solved = report.puzzlesAssigned === report.puzzlesSolved
        e.completed = report.puzzlesAssigned === (report.puzzlesSolved + report.puzzlesTimeup + report.puzzlesAttemptup)
        e.points = report.pointsSecured
      }
    })
    return data
  }

  const loadMore = useCallback(async() => {
    if (!(hasMore.current && lastDoc.current)) return;
    setLoading(true)
    const docs = await getAssignments(await getData(...getQuery(user), [lastDoc.current.start]))
    lastDoc.current = docs.at(-1)
    hasMore.current = docs.length === pageSize
    setDocs(d => [...d, ...docs])
    setLoading(false)
  }, [])

  const loadData = useCallback(async() => {
    setProgress(true)
    const docs = await getAssignments(await getData(...getQuery(user)))
    lastDoc.current = docs.at(-1);
    hasMore.current = docs.length === pageSize
    setDocs(docs)
    setProgress(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  if (solve) return <Solve doc={solve} onClose={onSolveClose} />

  return (
    <View style={{...s.f1, ...s.bc2}}>
      {progress ? <Progress /> : <>
        <Header title='Assignment' icon={<MaterialIcons name='assignment' size={25} color='#F50057' />} filter={false} />
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
          renderItem={({item}) => <View style={{...s.fdr, ...s.br8, ...s.p8, ...s.g8, backgroundColor: selected.current === item.id ? '#666' : '#333'}}>
          <Date {...item.d} />
          <View style={{...s.f1, ...s.jcc, ...s.g8}}>
            <View style={{...s.fdr, ...s.aic, ...s.g4}}>
              <Text variant='bodyLarge' style={{...s.f1}}>{item.name}</Text>
              <Level value={item.level} />
            </View>
            <View style={{...s.fdr, ...s.aic, ...s.g4}}>
              <Icon source='calendar-clock' size={20} />
              <Text>{item.end ? dayjs(item.end.seconds * 1000).format('DD-MMM-YYYY') : '--'}</Text>
              <Icon source='puzzle-outline' size={20} />
              <Text>{(item.activities || []).length}</Text>
            </View>
            <View style={{...s.fdr, ...s.aic, ...s.g4}}>
              <Chip type={item.solved ? 'success' : item.completed ? 'info' : 'pause'} text={item.solved ? 'Solved' : item.completed ? 'Completed' : 'In Progress'} />
              <View style={s.mla} />
              <Button type='info' title={(item.solved || item.completed) ? 'DETAILS' : 'SOLVE'} onPress={() => setSolve(item)} />
            </View>
          </View>
        </View>}
        /> : <Empty />}
      </>}
    </View>
  )
}