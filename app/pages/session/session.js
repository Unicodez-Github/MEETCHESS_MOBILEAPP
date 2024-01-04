import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
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

const getQuery = ({ user = null, academy = null, role = null, from = null, to = null, participant = null, status = 3 }) => {
  const field = !user ? 'academy' : role === 'G' ? 'participants' : 'createdBy';
  const match = field === 'participants' ? 'array-contains' : '==';
  const query = [
    'sessions', [[field, match, field === 'academy' ? academy : user], ['status', '==', status],
    ['date', '>=', from], ['date', '<=', to]], [['date', status === 3 ? 'desc' : 'asc']]
  ];
  if (participant && role !== 'G') {
    const and = query.at(1);
    and.push(['participants', 'array-contains', participant]);
  }
  return query;
};

const Session = ({onNavigate=()=>{}}) => {
  const user = useRecoilValue(UserState);
  const lastDoc = useRef(null);
  const hasMore = useRef(false);
  const [settings] = useState((user?.features || []).find(e => e && e.id && e.id === '3')?.options || []);
  const [progress, setProgress] = useState(true);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [msg, setMsg] = useState(null);
  const [coach, setCoach] = useState(['C', 'D'].includes(user.role) ? '-' : user.id);
  const [student, setStudent] = useState(null);
  const [fromDate, setFromDate] = useState(dayjs());
  const [toDate, setToDate] = useState(dayjs());
  const setSessn = useSetRecoilState(SessnState);
  const [create, setCreate] = useState(false);

  const joinSession = async(data) => {
    const room = await getDocs(collection(db, 'sessions', data.id, 'room'));
    if (room.empty) {
      await Promise.all([
        setDoc(doc(db, 'sessions', data.id, 'room', 'move'), {
          fen: startFen,
          index: '_',
          moves: [{ i: '_', f: startFen }],
          event: null,
        }),
        setDoc(doc(db, 'sessions', data.id, 'room', 'chat'), {
          zomid: null,
          zomlk: null,
          msges: [],
          rspns: [],
        }),
        setDoc(doc(db, 'sessions', data.id, 'room', 'data'), {
          prmvd: null,
          qustn: null,
          ansrs: [],
          pints: []
        }),
        setDoc(doc(db, 'sessions', data.id, 'room', 'ctrl'), {
          shwCs: true,
          shwCn: true,
          shwPn: false,
          shwLm: false,
          shwMs: false,
          shwPs: false,
          shwCt: false,
          alwIm: false,
          jitsi: false,
          wctrl: null,
          bctrl: null,
          start: serverTimestamp()
        })
      ]);
    } else if (data.createdBy === user.id) {
      await updateDoc(doc(db, 'sessions', data.id, 'room', 'ctrl'), {jitsi: false});
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
          await changeDoc('sessions', data.id, { status: 1 });
          joinSession(data);
        }
      } else if (res.status === 3) {
        loadData();
        setMsg({ type: 'info', text: 'Session completed.' });
      } else {
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

  const onCreateClose = useCallback((data) => {
    if (data) {
      loadData();
    } else {
      setProgress(false);
    } setCreate(false);
  }, []);

  const getFilter = useCallback(() => {
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
    const docs = await getData(...getQuery(getFilter()), [lastDoc.current.date]);
    lastDoc.current = docs.at(-1);
    hasMore.current = docs.length === pageSize;
    setDocs(d => [...d, ...docs.map(e => ({ ...e, d: parseDate(e.date), t: parseTime(e.time || 0) }))]);
    setLoading(false);
  }, [getFilter]);

  const loadData = useCallback(async() => {
    if (!(fromDate && toDate)) return;
    setProgress(true);
    const [INP, ACT] = await Promise.all([
      getData(...getQuery({ ...getFilter(), status: 1 })),
      getData(...getQuery({ ...getFilter(), status: 2 }))
    ]);
    const docs = await getData(...getQuery(getFilter()));
    lastDoc.current = docs.at(-1);
    hasMore.current = docs.length === pageSize;
    setDocs([...INP, ...ACT, ...docs].map(e => ({ ...e, d: parseDate(e.date), t: parseTime(e.time || 0) })));
    setProgress(false);
  }, [getFilter]);

  useEffect(() => {
    loadData();
  }, []);
  
  return (
    progress ? <Progress /> : create ? <Create onClose={onCreateClose} /> : <View style={{...s.f1, ...s.bc2}}>
      <Header title='Session' icon={<FontAwesome5 name='headphones-alt' size={25} color='#F50057' />} onBack={() => onNavigate('Root')}>
        <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g2, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={onCreate}>
          <Feather name='plus' size={20} />
          <Text>CREATE</Text>
        </TouchableOpacity>
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
              <TouchableOpacity style={{...s.p8, ...s.mla}}>
                <FontAwesome5 name='users' color='#FFF' size={22} />
              </TouchableOpacity>
            </View>
            <View style={{...s.fdr, ...s.aic, ...s.g8}}>
              <Chip type={item.status === 3 ? 'success' : item.status === 2 ? 'play' : 'pause'} text={item.status === 3 ? 'Completed' : item.status === 2 ? 'Yet To Start' : 'Inprogress'} />
              <View style={s.mla} />
              {(['E', 'F', 'G'].includes(user?.role) && item.status !== 3) && <Button type='success' title='JOIN' onPress={() => onJoinPress(item)} />}
              {((user.role !== 'D' || settings.includes('3')) && item.status === 3) && <Button title='VIEW' />}
            </View>
          </View>
        </View>}
      /> : <Empty />}
    </View>
  );
};

export default Session;
