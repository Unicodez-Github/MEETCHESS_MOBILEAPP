import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { BackHandler, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { arrayUnion, collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { db } from '../../firebase';
import { Button, Chip, Date, Empty, Header, Progress } from '../../factory';
import { changeDoc, getData, getDocById, parseDate, parseTime, serverTime } from '../../service';
import { SessnState, UserState } from '../../state';
import { pageSize, startFen } from '../../constant';
import dayjs from 'dayjs';
import Create from './create';
import s from '../../style';
import Filter from './filter';
import { IconButton, Snackbar } from 'react-native-paper';
import Delete from './delete';
import Room from './room';

const getQuery = ({ user = null, academy = null, role = null, from = null, to = null, participant = null, status = 3 }) => {
  const field = !user ? 'academy' : role === 'G' ? 'participants' : 'createdBy';
  const match = field === 'participants' ? 'array-contains' : '==';
  const query = [
    'sessions', [[field, match, field === 'academy' ? academy : user], status === 3 ? ['status', '==', status] : ['status', 'in', [1, 2]],
    ['date', '>=', from], ['date', '<=', to]], [['date', status === 3 ? 'desc' : 'asc']]
  ];
  if (participant && role !== 'G') {
    const and = query.at(1);
    and.push(['participants', 'array-contains', participant]);
  }
  return query;
};

const defaultSession = {
  move: {
    fen: startFen,
    side: true,
    index: '_',
    moves: [{i: '_', f: startFen}]
  },
  ctrl: {
    shwCs: true,
    shwCn: true,
    shwPn: false,
    shwLm: false,
    shwMs: false,
    shwPs: false,
    shwCt: false,
    alwIm: false,
    wctrl: null,
    bctrl: null,
    prmvd: null,
    zoom: null,
    qustn: null,
    msges: [],
    rspns: [],
    ansrs: [],
    pints: []
  }
};

const Session = ({navigation}) => {
  const user = useRecoilValue(UserState);
  const lastDoc = useRef(null);
  const hasMore = useRef(false);
  const [settings] = useState((user?.features || []).find(e => e && e.id && e.id === '3')?.options || []);
  const [progress, setProgress] = useState(true);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [toast, setToast] = useState(null);
  const [msg, setMsg] = useState(null);
  const [coach, setCoach] = useState(['C', 'D'].includes(user.role) ? '-' : user.id);
  const [student, setStudent] = useState(null);
  const [fromDate, setFromDate] = useState(dayjs());
  const [toDate, setToDate] = useState(dayjs());
  const [sessn, setSessn] = useRecoilState(SessnState);
  const [create, setCreate] = useState(false);
  const [remove, setRemove] = useState(null);

  const joinSession = async(data) => {
    const room = await getDocs(collection(db, 'sessions', data.id, 'live'));
    if (room.empty) {
      await Promise.all([
        setDoc(doc(db, 'sessions', data.id, 'live', 'move'), defaultSession.move),
        setDoc(doc(db, 'sessions', data.id, 'live', 'ctrl'), defaultSession.ctrl)
      ]);
    } else if (data.createdBy === user.id) {
      await updateDoc(doc(db, 'sessions', data.id, 'live', 'ctrl'), {jitsi: false});
    }
    if (user.role === 'G') await updateDoc(doc(db, 'sessions', data.id), {attended: arrayUnion(user.id)});
    setSessn(data);
    setProgress(false);
  };

  const onJoinPress = async(data) => {
    if (!(data && data.id)) return;
    setProgress(true);
    const res = await getDocById('sessions', data.id);
    if (res?.id && res?.status && res?.date) {
      if (res.status === 2) {
        if (res.date && res.date.seconds && (res.date.seconds - await serverTime()) > 0) {
          setMsg({ type: 'info', text: 'Session not yet started.' });
          setProgress(false);
        } else {
          await changeDoc('sessions', data.id, {start: serverTimestamp(), status: 1 }, user?.id);
          joinSession(data);
        }
      } else if (res.status === 3) {
        loadData();
        setMsg({ type: 'info', text: 'Session completed.' });
      } else {
        !res?.start && await changeDoc('sessions', data.id, {start: serverTimestamp()}, user?.id);
        joinSession(data);
      }
    } else {
      setMsg({ type: 'error', text: 'Session loading failed.' });
      setProgress(false);
    }
  };

  const onCreate = () => {
    setProgress(false);
    setCreate(true);
  };

  const onRoomClose = useCallback(async(docId, start) => {
    setSessn(null)
    setProgress(true)
    const time = await serverTime() - start
    const res = await changeDoc('sessions', docId, {status: 3, time}, user?.id)
    if (res) {
      loadData()
    } else {
      setProgress(false)
    }
  }, [])

  const onCreateClose = useCallback((data) => {
    if (data) {
      loadData();
    } else {
      setProgress(false);
    } setCreate(false);
  }, []);

  const onFilterClose = useCallback(({fd, td}) => {
    setFromDate(fd)
    setToDate(td)
    setShowFilter(false)
  }, [])
  
  const onDeleteClose = useCallback(async(data) => {
    setRemove(null)
    if (!data) return
    setProgress(true)
    const res = await changeDoc('sessions', data, {status: 0}, user?.id)
    if (res) {
      setToast({type: 'success', text: 'Data deleted successfully!'})
      loadData()
    } else {
      setProgress(false)
      setToast({type: 'error', text: 'Data deleting failed!'})
    }
  }, []) 

  const filter = useMemo(() => {
    let from = fromDate.startOf('day').toDate();
    let to = toDate.endOf('day').toDate();
    if (toDate.isBefore(fromDate)) {
      setToDate(fromDate);
      to = fromDate.endOf('day').toDate();
    }
    return { user: coach === '-' ? null : coach, academy: user.academy, role: user.role, from, to, participant: student ? student.id : null };
  }, [fromDate, toDate, coach, student]);

  const loadMore = useCallback(async() => {
    if (!(fromDate && toDate && hasMore.current && lastDoc.current)) return;
    setLoading(true);
    const docs = await getData(...getQuery(filter), [lastDoc.current.date]);
    lastDoc.current = docs.at(-1);
    hasMore.current = docs.length === pageSize;
    setDocs(d => [...d, ...docs.map(e => ({ ...e, d: parseDate(e.date), t: parseTime(e.time || 0) }))]);
    setLoading(false);
  }, [filter]);

  const loadData = useCallback(async() => {
    if (!(fromDate && toDate)) return;
    setProgress(true);
    const INP = await getData(...getQuery({...filter, status: 1}));
    const docs = await getData(...getQuery(filter));
    lastDoc.current = docs.at(-1);
    hasMore.current = docs.length === pageSize;
    setDocs([...INP, ...docs].map(e => ({ ...e, d: parseDate(e.date), t: parseTime(e.time || 0) })));
    setProgress(false);
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [filter]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.navigate('Root')
      return true
    })
    return () => backHandler.remove()
  }, [])
  
  return (
    progress ? <Progress /> : create ? <Create onClose={onCreateClose} /> : sessn ? <Room onClose={onRoomClose} /> : <View style={{...s.f1, ...s.bc2}}>
      <Filter open={showFilter} from={fromDate} to={toDate} onClose={onFilterClose} />
      <Delete data={remove} onClose={onDeleteClose} />
      <Snackbar visible={toast !== null} onDismiss={() => setToast(null)}>{toast?.text}</Snackbar>
      <Header title='Session' icon={<FontAwesome5 name='headphones-alt' size={25} color='#F50057' />} onFilter={() => setShowFilter(true)}>
        {(['C', 'E'].includes(user?.role) || settings.includes('1')) && <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g2, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={onCreate}>
          <Feather name='plus' size={20} />
          <Text>CREATE</Text>
        </TouchableOpacity>}
      </Header>
      {docs.length ? <FlatList
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
            <View style={{...s.fdr, ...s.aic, ...s.g8}}>
              <Text numberOfLines={2} style={{...s.f1, ...s.cfff, ...s.fs17}}>{item.name}</Text>
              {/* {(['C', 'E'].includes(user?.role) || settings.includes('3')) && <TouchableOpacity style={{...s.p8, ...s.mla}}>
                <FontAwesome5 name='users' color='#FFF' size={22} />
              </TouchableOpacity>} */}
            </View>
            <View style={{...s.fdr, ...s.aic, ...s.g4}}>
              <Chip type={item.status === 3 ? 'success' : item.status === 2 ? 'play' : 'pause'} text={item.status === 3 ? 'Completed' : item.status === 2 ? 'Yet To Start' : 'In progress'} />
              <View style={s.mla} />
              {(item.status !== 3) && <Button type='success' title='JOIN' onPress={() => onJoinPress(item)} />}
              {((user.role !== 'D' || settings.includes('3')) && item.status === 3) && <Button title='VIEW' />}
              {(['C', 'E'].includes(user?.role) || settings.includes('4')) && <IconButton containerColor='#F50057AA' mode='contained-tonal' icon='delete-outline' onPress={() => setRemove(item?.id)} />}
            </View>
          </View>
        </View>}
      /> : <Empty />}
    </View>
  );
};

export default Session;
