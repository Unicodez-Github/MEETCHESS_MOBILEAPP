import { View, BackHandler, ScrollView, TouchableOpacity } from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconButton, Portal, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useRecoilValue } from 'recoil'
import { getActivities, getReport, parseTime, saveAssAnswer, saveReport } from '../../service'
import { Progress, Toast } from '../../factory'
import { emptyFen, Game } from '../../chess'
import { UserState } from '../../state'
import { Board } from '../chess'
import s from '../../style'

const getPgn = (moves) => {
  return moves.filter(m => m && m.s && m.i && m.i !== '_').map(m => {
    let move = m.n ? `${m.n} ${m.s}` : m.s;
    if (m.c && typeof m.c === 'string') move += ` {${m.c}}`;
    if (m.v && m.v.length) m.v.forEach(v => move += ` (${getPgn(v)})`);
    return move;
  }).join(' ');
}

const defaultReport = {
  report: null,
  user: null,
  puzzlesAssigned: 0,
  puzzlesSolved: 0,
  puzzlesTimeup: 0,
  puzzlesAttemptup: 0,
  pointsAssigned: 0,
  pointsSecured: 0
}

export default function Solve({doc = null, onClose = () => {}}) {
  const game = useRef(new Game()).current
  const puzzles = useRef([])
  const timer = useRef()
  const tstcl = useRef()
  const count = useRef(0)
  const scrollRef = useRef()
  const activity = useRef(null)
  const store = useRef({report: defaultReport, reportId: null, reportChanged: false}).current
  const user = useRecoilValue(UserState)
  const [progress, setProgress] = useState(true)
  const [toast, setToast] = useState(null)
  const [time, setTime] = useState(0)
  const [activities, setActivities] = useState([])
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(false)
  const [orientation, setOrientation] = useState(false)
  const [fen, setFen] = useState(emptyFen)
  const [turn, setTurn] = useState('w')
  const [lastMove, setLastMove] = useState(null)
  const [pgn, setPgn] = useState('')
  const [timeUp, setTimeUp] = useState(false)
  const [attemptUp, setAttemptUp] = useState(false)

  const startTimer = () => {
    timer.current && clearInterval(timer.current)
    timer.current = setInterval(() => {
      count.current += 1
      setTime(count.current)
    }, 1000)
  }

  const selectNext = (data) => {
    const ind = data + 1 <= puzzles.current.length - 1 ? data + 1 : 0;
    const incomplete = puzzles.current.filter(e => e && !e.solved && !e.timeUp && !e.attemptUp);
    if (incomplete && incomplete.length) {
      const nextAct = incomplete.find(e => e && e.id === `${e.activity}-${ind}`);
      if (nextAct) {
        setIndex(ind);
        selectActivity(nextAct);
      } else {
        selectNext(ind);
      }
    } else {
      tstcl.current && clearTimeout(tstcl.current)
      const type = puzzles.current.find(e => e && !e.solved) ? 'info' : 'success';
      setToast({type, text: 'info' ? 'You have completed all the puzzles.' : 'You have solved all the puzzles.'});
    }
  };

  const saveAnswer = async(ans) => {
    const act = puzzles.current.find(e => e.id === activity.current.id);
    if (ans) {
      act.answers.push(ans);
      act.solved = ans.s === 1;
      const penalty = doc?.penalty && +doc?.penalty > 0 && act.answers.filter(({ s }) => s === 0).length * +doc?.penalty;
      const score = +doc?.score - penalty;
      act.score = (act.solved && score > 0) ? score : 0;
      act.attemptCount = act.answers.length;
      if (act.solved) {
        // const update = { ratingpl: (rating?.ratingpl ? rating?.ratingpl : 900) + (doc?.level || 1) };
        // await saveDoc('users', update, user?.id, user?.id);
        // setRating(data => ({ ...data, ...update }));
      } else if (!act.solved && !act.attemptUp && doc && doc?.maxAttempt && +doc?.maxAttempt > 0 && act.attemptCount >= +doc?.maxAttempt) {
        timer.current && clearInterval(timer.current);
        setDrag(false);
        setAttemptUp(true);
        setPgn(getPgn(game.moves()));
        act.attemptUp = true;
        store.report.puzzlesAttemptup += 1;
        store.reportChanged = true;
        await updateReport();
        // const update = { ratingpl: (rating?.ratingpl ? rating?.ratingpl : 900) - (doc?.level || 1) };
        // await saveDoc('users', update, user?.id, user?.id);
        // setRating(data => ({ ...data, ...update }));
      }
    }

    if (activity.current.timeUp) act.timeUp = true;

    act.timeTaken = count.current;

    const answer = {
      assignment: doc?.id,
      activity: act.activity,
      answers: act.answers,
      solved: act.solved,
      timeTaken: act.timeTaken,
      score: act.score,
      user: user.id
    };
    
    const { id } = await saveAssAnswer(answer, act.answerId);
    act.answerId = id;
    activity.current = act;

    if (act.solved) {
      store.report.puzzlesSolved += 1;
      store.report.pointsSecured += +act.score;
      store.reportChanged = true;
      await updateReport();
    }

    if (activity.current.solved) {
      timer.current && clearInterval(timer.current);
      const [_, i] = activity.current.id.split('-');     
      setTimeout(() => selectNext(+i), 500);
    }

    if (!ans) return 'TIMEUPDATED';
  }

  const onIndChange = (ind) => {
    setIndex(ind);
    selectActivity(puzzles.current.find(e => e && e.id === `${e.activity}-${ind}`));
  };

  const onPrev = () => {
    const ind = index - 1 >= 0 ? index - 1 : 0
    selectActivity(puzzles.current.find(e => e && e.id === `${e.activity}-${ind}`))
    setIndex(ind)
  }

  const onNext = () => {
    const ind = index + 1 <= puzzles.current.length - 1 ? index + 1 : puzzles.current.length - 1
    selectActivity(puzzles.current.find(e => e && e.id === `${e.activity}-${ind}`))
    setIndex(ind)
  }

  const showAlert = (type) => {
    setToast({type, text: type === 'error' ? 'Incorrect !' : 'Correct !'})
    tstcl.current && clearTimeout(tstcl.current)
    tstcl.current = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(tstcl.current);
  }

  const onDrop = useCallback(({piece, ...data}) => {
    if (data?.from && data?.to && piece && data?.from !== data?.to) {
      const res = game.solve(data)
      if (!res) return 'back'
      const { status, move, next } = res
      if (status === 1) {
        showAlert('success');
        const pgn = game.pgn(); setPgn(pgn);
        setFen(game.fen());
        setLastMove(move);
        if (move.i === activity.current.last || !next || (move && next && move.i && next.i && move.i.split('-').length !== next.i.split('-').length)) {
          setDrag(false);
          saveAnswer({ f: game.fen(), m: pgn, t: time, s: status });
        } else if (next) {
          setTimeout(() => {
            const res = game.solve({ s: next.s });
            const pgn = game.pgn(); setPgn(pgn);
            setFen(game.fen());
            setLastMove(res.move);
            if (res.move.i === activity.current.last || (res && !res.next) || (res && res.move && res.next && res.move.i && res.next.i && res.move.i.split('-').length !== res.next.i.split('-').length)) {
              setDrag(false);
              saveAnswer({ f: game.fen(), m: pgn, t: time, s: status });
            }
          }, 750);
        }
      } else if (status === 0) {
        showAlert('error');
        saveAnswer({ f: move.f, m: move.p, t: time, s: status });
        return 'back'
      }
    }
  }, [])

  const updateReport = async() => {
    if (!store.reportChanged) return;
    const { id } = await saveReport(store.report, store.reportId);
    store.reportId = id;
    store.reportChanged = false;
    return;
  };

  const selectActivity = async(data) => {
    if (count.current > 0 && activity.current && !activity.current.solved && !activity.current.timeUp && !activity.current.attemptUp) await saveAnswer();
    timer.current && clearInterval(timer.current);
    game.load(data);
    setDrag(false);
    setOrientation(game.orientation());
    setFen(game.fen());
    setTurn(game.turn());
    setLastMove(null);
    setPgn('');
    setTimeUp(false);
    setAttemptUp(false);
    activity.current = data;
    activity.current.last = game.last();
    if (!activity.current.last) return;

    count.current =  data.timeTaken || 0;
    
    if (data.solved) {
      const ans = data.answers.find(({ s }) => s === 1);
      if (ans && ans.f) setFen(ans.f);
      setPgn(ans?.m || '');
    } else if (data.timeUp) {
      setTimeUp(true);
      setPgn(getPgn(game.moves()));
    } else if (data.attemptUp) {
      setAttemptUp(true);
      setPgn(getPgn(game.moves()));
    } else {
      setDrag(true);
      startTimer();
    }
  };

  const loadData = async() => {
    setProgress(true);

    const report = await getReport(doc?.id, user?.id);
    store.reportId = report ? report.id : null;
    store.report.report = report ? report.report : doc?.id;
    store.report.user = report ? report.user : user.id;
    store.report.puzzlesAssigned = report ? report.puzzlesAssigned : (doc?.activities || []).length;
    store.report.pointsAssigned = report ? report.pointsAssigned : (+(doc?.score || 0) * (doc?.activities || []).length);
    store.report.puzzlesSolved = report ? report.puzzlesSolved : 0;
    store.report.puzzlesTimeup = report ? report.puzzlesTimeup : 0;
    store.report.puzzlesAttemptup = report ? report.puzzlesAttemptup : 0;
    store.report.pointsSecured = report ? report.pointsSecured : 0;

    const actvtys = await getActivities(doc, user.id);
    actvtys.forEach((e, i) => {
      e.id = `${e.activity}-${i}`;
      e.isLast = i === actvtys.length - 1;
    });
    puzzles.current = actvtys
    setActivities(puzzles.current)

    const solved = puzzles.current.filter(e => e && e.solved).length;
    const timeUp = puzzles.current.filter(e => e && e.timeUp).length;
    const attemptUp = puzzles.current.filter(e => e && e.attemptUp).length;
    const points = puzzles.current.reduce((p, c) => p += c.score, 0);

    if (store.report.puzzlesSolved !== solved) {
      store.report.puzzlesSolved = solved;
      store.reportChanged = true;
    }

    if (store.report.puzzlesTimeup !== timeUp) {
      store.report.puzzlesTimeup = timeUp;
      store.reportChanged = true;
    }

    if (store.report.puzzlesAttemptup !== attemptUp) {
      store.report.puzzlesAttemptup = attemptUp;
      store.reportChanged = true;
    }

    if (store.report.pointsSecured !== points) {
      store.report.pointsSecured = points;
      store.reportChanged = true;
    }

    await updateReport();

    const incomplete = puzzles.current.find(e => e && !e.solved && !e.timeUp && !e.attemptUp);
    if (incomplete) {
      const [_, i] = incomplete.id.split('-');
      setIndex(+i);
      selectActivity(incomplete);
    } else {
      setIndex(0);
      selectActivity(puzzles.current[0]);
      tstcl.current && clearTimeout(tstcl.current)
      const type = puzzles.current.find(e => e && !e.solved) ? 'info' : 'success';
      setToast({type, text: 'info' ? 'You have completed all the puzzles.' : 'You have solved all the puzzles.'});
    }
    
    setProgress(false);
  }

  const onTimeOut = async() => {
    timer.current && clearInterval(timer.current);
    setDrag(false);
    setTimeUp(true);
    setPgn(getPgn(game.moves()));
    activity.current.timeUp = true;
    store.report.puzzlesTimeup += 1;
    store.reportChanged = true;
    await updateReport();
    await saveAnswer();
    // const update = { ratingpl: (rating?.ratingpl ? rating?.ratingpl : 900) - (doc.level || 1) };
    // await saveDoc('users', update, user?.id, user?.id);
    // setRating(data => ({ ...data, ...update }));
    return;
  };

  useEffect(() => {
    if (activity.current && !activity.current.timeUp && doc && doc.maxTime && +doc.maxTime > 0 && time >= +doc.maxTime) {
      onTimeOut();
    }
  }, [time]);

  useEffect(() => {
    if (!progress && activities.length) {
      setTimeout(() => scrollRef.current?.scrollTo({x: 60 * index, y: 0, animated: true}))
    }
  }, [index, activities, progress])

  const close = async() => {
    if (count.current > 0 && activity.current && !activity.current.solved && !activity.current.timeUp && !activity.current.attemptUp) await saveAnswer();
    timer.current && clearInterval(timer.current);
    tstcl.current && clearTimeout(tstcl.current);
    onClose();
  }

  useEffect(() => {
    loadData()
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      close()
      return true
    })
    
    return () => backHandler.remove()
  }, [])

  return (
    <Portal>
      <SafeAreaView style={{...s.fg1, ...s.bc3}}>
        {progress ? <Progress /> : <>
          <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.p8, ...s.bc2, paddingLeft: 4}}>
            <MaterialIcons name='assignment' color='#87CEFA' size={30} />
            <Text variant='titleLarge' style={s.mra}>{doc?.name}</Text>
            <Text variant='titleLarge'>{parseTime(time)}</Text>
          </View>
          <View style={{...s.fdr, ...s.aic, ...s.jcc, ...s.p8, ...s.bc2, height: 48}}>
            {timeUp ? <Toast type='error' text='You have exceeded max time limit' /> : attemptUp ? <Toast type='error' text='You have exceeded max attempt limit' /> : toast ? <Toast {...toast} /> : undefined}
          </View>
          <ScrollView overScrollMode='never'>
            <View style={{pointerEvents: 'auto'}}>
              <Board
                fen={fen}
                orientation={orientation}
                draggable={drag}
                lastMove={lastMove}
                onDrop={onDrop}
              />
            </View>
            <View style={{...s.fdr, ...s.aic, ...s.jcc, ...s.g8, pointerEvents: 'auto'}}>
              <IconButton icon='chevron-left' size={36} onPress={onPrev} iconColor='#87CEFA' />
              <Text variant='titleMedium'>{index + 1} / {activities.length}</Text>
              <IconButton icon='chevron-right' size={36} onPress={onNext} iconColor='#87CEFA' />
            </View>
            <Text variant='bodyLarge' style={s.mb8}>{pgn}</Text>
            <ScrollView ref={scrollRef} overScrollMode='never' contentContainerStyle={s.g8} horizontal={true} showsHorizontalScrollIndicator={false}>
              {activities.map((a, e) => <TouchableOpacity key={e} style={{height: 52, width: 52, ...s.aic, ...s.jcc, ...s.br8, backgroundColor: index === e ? '#4169E1' : a?.solved ? 'green' : a?.answers?.length ? 'red' : '#222'}} onPress={() => onIndChange(e)}>
                <Text variant='titleMedium'>{e + 1}</Text>
              </TouchableOpacity>)}
            </ScrollView>
          </ScrollView>
        </>}
      </SafeAreaView>
    </Portal>
  );
}
