import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { KeyboardAvoidingView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { arrayUnion, doc, increment, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { child, onDisconnect, onValue, ref, set, update } from 'firebase/database';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Button, Dialog, Icon, Portal } from 'react-native-paper'
import { db, rdb } from '../../firebase';
import { createDoc, parseTime, saveAnswer, serverTime, timeOffset } from '../../service';
import { startFen } from '../../constant';
import { Header, Progress } from '../../factory';
import { Game, getPawnStructure } from '../../chess';
import { SessnState, SetngState, UserState, UsersState } from '../../state';
import Board from '../../cboard';
import Tool from './tool';
import Position from './position';
import Puzzle from './puzzle';
import AskQuestion from './question/create';
import ViewQuestion from './question/view';
import SolveQuestion from './question/solve';
import Move from '../../move';
import Chat from './chat';
import Respond from './repond';
import Response from './response';
import Participant from './participant';
import Leaderboard from './leaderboard';
import Jitsi from './jitsi';
import Engine from './engine';
import s from '../../style';
import Settings from './settings';
import dayjs from 'dayjs';
import AddParticipant from './addparticipant';
import Sharescreen from './sharescreen';

const getPgn = (moves) => {
  return moves.filter(m => m && m.s && m.i && m.i !== '_').map(m => {
    let move = m.n ? `${m.n} ${m.s}` : m.s;
    if (m.v && m.v.length) m.v.forEach(v => move += ` (${getPgn(v)})`);
    return move;
  }).join(' ');
};

const getPoints = (qustn = null, ansrs = [], pints = []) => {
  let points = pints;
  if (qustn && ansrs.length) {
    const score = qustn?.score || 0;
    const penalty = qustn?.penalty || 0;
    points = pints.map(e => {
      const obj = {...e, attempt: ansrs.filter(a => a.user === e.user && a.s === 0).length};
      if (ansrs.find(a => a.user === obj.user && a.s === 1)) {
        const point = score - (obj.attempt * penalty);
        obj.point += point > 0 ? point : 0;
        obj.attempt += 1;
      } return obj;
    });
  }
  points.sort((a, b) => a.attempt - b.attempt);
  points.sort((a, b) => b.point - a.point);
  return points;
};

const Room = ({onClose = () => {}}) => {
  const tabRef = useRef('xxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))).current
  const user = useRecoilValue(UserState);
  const users = useRecoilValue(UsersState);
  const settings = useRecoilValue(SetngState);
  const counter = useRef(null);
  const sesnRef = useRef(null);
  const moveRef = useRef(null);
  const ctrlRef = useRef(null);
  const clockRef = useRef();
  const timeoffsetRef = useRef();
  const squaresRef = useRef([]);
  const legalMoveRef = useRef(true);
  const [game] = useState(new Game());
  const [progress, setProgress] = useState(true);
  const [count, setCount] = useState(0);
  const [sessn, setSessn] = useRecoilState(SessnState);
  const [host] = useState(sessn?.createdBy === user?.id)
  const [participants, setParticipants] = useState(users.filter(({id}) => sessn?.createdBy !== id && sessn?.participants.includes(id)).map(({id, name, role}) => ({id, name, role, joined: false, whiteCtrl: false, blackCtrl: false})));
  const [notation, setNotation] = useState(true);
  const [mode, setMode] = useState(1);
  const [fen, setFen] = useState(game.fen());
  const [side, setSide] = useState(game.orientation());
  const [turn, setTurn] = useState(game.turn());
  const [squares, setSquares] = useState([]);  
  const [arrows, setArrows] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [legalMove, setLegalMove] = useState(true);
  const [activeTools, setActiveTools] = useState([]);
  const [moves, setMoves] = useState([]);
  const [index, setIndex] = useState('_');
  // const [jitsi, setJitsi] = useState(false);
  // const [jitsiReload, setJitsiReload] = useState(false);
  const [whiteCtrl, setWhiteCtrl] = useState(false);
  const [blackCtrl, setBlackCtrl] = useState(false);
  const [screenCtrl, setScreenCtrl] = useState(false)
  const [showChat, setShowChat] = useState(false);
  const [showMoves, setShowMoves] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [showPieces, setShowPieces] = useState(true);
  const [showPawnStructure, setShowPawnStructure] = useState(false);
  const [showLegalMoves, setShowLegalMoves] = useState(false);
  const [showPosition, setShowPosition] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGameLoad, setShowGameLoad] = useState(false);
  const [showPastePgn, setShowPastePgn] = useState(false);
  const [askQuestion, setAskQuestion] = useState(null);
  const [zoomMeetUrl, setZoomMeetUrl] = useState(null);
  const [messages, setMessages] = useState([]);
  const [responds, setResponds] = useState([]);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [points, setPoints] = useState([]);
  const [tab, setTab] = useState(1);
  const [end, setEnd] = useState(null);
  const [addParticipant, setAddParticipant] = useState(false)

  const [message, setMessage] = useState(null);

  const sendData = async(docId, data) => {
    let result = false;
    try {
      await updateDoc(doc(db, 'sessions', sessn?.id, 'live', docId), data);
      result = true;
    } finally {
      return result;
    }
  };

  const saveGame = async(data) => {
    let save = false;
    if (data && data.fen && data.moves) {
      if (data.fen === startFen) {
        const history = JSON.parse(data.moves);
        if (history && ((history.length === 1 && history.find(h => h.a || h.c)) || history.length > 1)) {
          save = true;
        }
      } else {
        save = true;
      }
    }
    // if (save) await saveDoc('games', {...data, type: 6, database: sessn?.id, event: sessn?.name}, user.id);
  };

  const onSendMessage = () => {
    if (message && message.trim()) {
      const data = arrayUnion({
        user: user.id,
        name: user.name,
        message: message,
        time: Date.now()
      });
      if (tab === 2) {
        sendData('chat', {msges: data});
      } else if (tab === 3) {
        sendData('chat', {rspns: data});
      }
    }
  };

  const onAskQuestion = useCallback(async(data) => {
    setAskQuestion(false);
    if (data) {
      setProgress(true);
      const quesId = await createDoc('questions', {...data, session: sessn?.id}, user?.id);
      const pints = [...(participants || []).map(({ id, name }) => {
        const user = ctrlRef.current.pints.find(e => e && e.user && e.user === id);
        return user ? { ...user, attempt: 0 } : { user: id, name, point: 0, attempt: 0 };
      })];
      await sendData('ctrl', { qustn: { ...data, id: quesId, start: serverTimestamp() }, pints, ansrs: [] });
      setProgress(false);
    }
  }, [participants]);

  const onEndQuestion = useCallback(async() => {
    if (question && question.id) {
      setProgress(true);
      const data = participants.map(({ id }) => {
        const ans = [...answers.filter(a => a.user === id && a.s !== 2).map(({ f, m, t, s }) => ({ f, m, t, s }))];
        const solved = ans.find(({ s }) => s === 1) ? true : false;
        const point = +question.score - (ans.filter(({ s }) => s === 0).length * +question.penalty);
        const score = (solved && point > 0) ? point : 0;
        const obj = {
          session: sessn?.id,
          question: question.id,
          user: id,
          answers: ans,
          solved,
          score
        }
        return obj;
      }).filter(e => e && e.session && e.question && e.user && e.answers && e.answers.length);
      await saveAnswer(data);
      await sendData('ctrl', { qustn: null, pints: points, ansrs: [] });
      setProgress(false);
    } return true;
  }, [question, answers, points, participants]);

  const onSolve = useCallback((data) => {
    sendData('ctrl', { ansrs: arrayUnion(data) });
  }, []);

  const onUndo = () => {
    if (moveRef.current.moves.length > 1) {
      const del = moveRef.current.moves.pop();
      del?.i && game.selectMove(del.i);
      sendData('move', {moves: moveRef.current.moves, index: game.prev() || moveRef.current.moves.at(-1).i, z: increment(1), side: false});
    }
  };

  const onFenChange = useCallback((fenstr) => {
    setShowPosition(false);
    if (fenstr) {
      sendData('move', {fen: fenstr, index: '_', moves: [{i: '_', f: fenstr}], z: increment(1)});
      saveGame({fen: game.startFen(), moves: game.content()});
    }
  }, []);

  const onGameLoad = (data) => {
    if (data?.fen && data?.moveIndex && data?.history?.length) {
      if (Math.floor(JSON.stringify(data).length / 1000000) === 0) {
        sendData('move', {fen: data.fen, index: data.moveIndex, moves: data.history, z: increment(1), side: true});
        saveGame({fen: game.startFen(), moves: game.content()});
      } else {
        setMsg({type: 'info', text: 'Please split the PGN since the size is more than 1 MB'});
      }
    }
  };

  const onPuzzleChange = useCallback((type, data) => {
    if (data) {
      if (type === 1) {
        onGameLoad(data)
      } else if (type === 2) {
        onFenChange(data?.fen)
      } else if (type === 3) {
        const {fen, history, moves} = data
        setAskQuestion({fen, pgn: JSON.stringify(history), ans: getPgn(moves)})
      }
    } else if (!askQuestion) {
      setSessn(null)
    }
  }, [askQuestion]);

  const onControl = useCallback((data) => {
    sendData('ctrl', data);
  }, []);

  const onResponse = useCallback((data) => {
    sendData('chat', { rspns: data });
  }, []);

  const onMove = useCallback((index) => sendData('move', {index, z: increment(1)}), []);

  const onDrag = useCallback((square) => {
    setSquares(game.possibleMoves(square));
  }, []);

  const onDrop = useCallback((from, to) => {
    setSquares([]);
    setArrows([]);
    const data = {from, to};
    const move = game.move(data, !legalMoveRef.current);
    if (move) {
      setFen(game.fen());
      setMoves(game.moves());
      setIndex(game.moveIndex());
      setTurn(game.turn());
      setLastMove(move);
      const update = typeof move === 'string' ? {index: move} : {index: move.i, moves: [...moveRef.current.moves, move]};
      sendData('move', {...update, z: increment(1)});
    } return move ? true : false;
  }, []);

  const onDraw = useCallback((fm, to) => {
    const move = moveRef.current.moves.find(({i}) => i === moveRef.current.index);
    if (move) {
      if (fm && to) {
        const [h, a] = settings;
        const c = fm === to ? h : a;
        const arrows = move.a || [];
        const dup = arrows.find(({f, t}) => f === fm && t === to);
        if (dup) {
          move.a = arrows.filter(({f, t}) => !(f === fm && t === to));
          if (!move.a.length) delete move['a'];
        } else {
          arrows.push({f: fm, t: to, c});
          move.a = arrows;
        }
      } else {
        delete move['a'];
      }
    }
    sendData('move', {moves: moveRef.current.moves, z: increment(1), side: false});
  }, [settings]);

  const onToolPress = useCallback((data) => {
    if (data === 'NEW') {
      onFenChange(startFen);
    } else if (data === 'COR') {
      sendData('ctrl', { shwCs: !ctrlRef.current.shwCs });
    } else if (data === 'HLT') {
      setMode(m => {
        const md = m === 1 ? null : 1;
        setActiveTools(a => {
          const at = md ? [...new Set(a.concat('HLT'))] : a.filter(e => e !== 'HLT');
          return at.filter(e => e !== 'ARW');
        });
        return md;
      });
    } else if (data === 'ARW') {
      setMode(m => {
        const md = m === 1 ? 2 : 1;
        setActiveTools(a => {
          const at = md === 2 ? [...new Set(a.concat('ARW'))] : a.filter(e => e !== 'ARW');
          return at.filter(e => e !== 'HLT');
        });
        return md;
      });
    } else if (data === 'FLP') {
      setSide(data => data === 'b' ? 'w' : 'b');
    } else if (data === 'PWN') {
      sendData('ctrl', { shwPn: !ctrlRef.current.shwPn });
    } else if (data === 'HDE') {
      sendData('ctrl', { shwCn: !ctrlRef.current.shwCn });
    } else if (data === 'POS') {
      setShowPosition(true);
    } else if (data === 'SET') {
      setShowSettings(true);
    } else if (data === 'SLM') {
      sendData('ctrl', { shwLm: !ctrlRef.current.shwLm });
    } else if (data === 'AIM') {
      sendData('ctrl', { alwIm: !ctrlRef.current.alwIm });
    } else if (data === 'PUZ') {
      setShowGameLoad(true);
    } else if (data === 'FST') {
      const first = game.first();
      if (first) onMove(first);
    } else if (data === 'PRE') {
      const prev = game.prev();
      if (prev) onMove(prev);
    } else if (data === 'NXT') {
      const next = game.next();
      if (next) onMove(next);
    } else if (data === 'LST') {
      const last = game.last();
      if (last) onMove(last);
    } else if (data === 'ASK') {
      let obj = { fen: game.fen(), pgn: '', ans: '' };
      const currInd = game.moveIndex(), nextInd = game.next();
      if (currInd && nextInd && currInd.split('-').length === nextInd.split('-').length) {
        const move = game.getMove(nextInd);
        if (move && move.s) {
          obj.pgn = JSON.stringify([{ f: game.fen() }, { s: move.s }]);
          if (move.n) {
            obj.ans = `${move.n} ${move.s}`;
          } else {
            const curMov = game.getMove(currInd);
            if (curMov && curMov.n) {
              obj.ans = `${curMov.n} ... ${move.s}`;
            } else {
              obj.ans = `1. ... ${move.s}`;
            }
          }
        } 
      } setAskQuestion(obj);
    } else if (data === 'CLR') {
      onDraw(null);
    } else if (data === 'ADU') {
      setAddParticipant(true)
    } else if (data === 'UND') {
      onUndo()
    }
  }, []);

  useEffect(() => {
    const infoRef = ref(rdb, '.info/connected')
    const userRef = ref(rdb, `/sessn/${sessn?.id}`)

    const infoLstn = onValue(infoRef, (snap) => {
      set(child(userRef, `/${user.id}`), {tab: tabRef, online: snap.val() ? true : false})
      onDisconnect(child(userRef, `/${user.id}`)).set({online: false})
    })

    const userLstn = onValue(userRef, (snap) => {
      const data = snap.exists() ? Object.entries(snap?.val()).map(([k, v]) => v?.online ? k : null) : []
      if (!data.includes(user.id)) set(child(userRef, `/${user.id}`), {online: true})
      setParticipants(p => ([...p.map(e => ({...e, joined: data.includes(e.id)}))]))
      const mytab = snap.toJSON()[user.id]
      if (!user?.multiSession && mytab?.tab && mytab.tab !== tabRef) {
        clockRef.current && clearInterval(clockRef.current);
        setSessn(null)
      }
    })

    const sesnLstn = onSnapshot(doc(db, 'sessions', sessn?.id), async(snap) => {
      if (snap.exists()) {
        sesnRef.current = snap.data();
        if (sesnRef.current?.start?.seconds) {
          timeoffsetRef.current = await timeOffset();
          clockRef.current && clearInterval(clockRef.current);
          clockRef.current = setInterval(() => setCount(dayjs(new Date().getTime() + timeoffsetRef.current).unix() - sesnRef.current?.start?.seconds), 1000);
          const participants = users.filter(({id}) => sesnRef.current?.participants.includes(id)).map(({id, name, role}) => ({id, name, role, joined: false, whiteCtrl: false, blackCtrl: false}));
          setParticipants(p => participants.map(e => p.find(s => s.id === e.id) || e));
        }
        if (sesnRef.current?.status === 3) {
          clockRef.current && clearInterval(clockRef.current);
          setEnd({type: 'info', text: 'Session completed!'});
          setTimeout(() => setSessn(null), 1000);
        }
      }
    });

    const moveLstn = onSnapshot(doc(db, 'sessions', sessn?.id, 'live', 'move'), async(snap) => {
      if (snap.exists()) {
        const {fen, index: moveIndex, moves: history} = snap.data();
        if (game.startFen() === fen) {
          setMoves(game.setMoves(history));
          const move = game.selectMove(moveIndex);
          if (move) {
            setFen(game.fen());
            setMoves(game.moves());
            setIndex(game.moveIndex());
            setTurn(game.turn());
            setLastMove(move);
            setArrows(game.arrows());
          }
          setSquares([]);
        } else {
          const move = game.loadHistory({fen, moveIndex, history});
          if (move) {
            setSide(game.orientation());
            setFen(game.fen());
            setMoves(game.moves());
            setIndex(game.moveIndex());
            setTurn(game.turn());
            setLastMove(move);
            setArrows(game.arrows());
          }
          setSquares([]);
        } moveRef.current = snap.data();
      }
    });

    const ctrlLstn = onSnapshot(doc(db, 'sessions', sessn?.id, 'live', 'ctrl'), async(snap) => {
      if (snap.exists()) {
        ctrlRef.current = snap.data();
        // setJitsi(ctrlRef.current.jitsi);
        setNotation(ctrlRef.current.shwCs);
        setShowPieces(ctrlRef.current.shwCn);
        setShowPawnStructure(ctrlRef.current.shwPn);
        setShowLegalMoves(ctrlRef.current.shwLm);
        setShowChat(ctrlRef.current.shwCt);
        setShowMoves(ctrlRef.current.shwMs);
        setShowPoints(ctrlRef.current.shwPs);
        legalMoveRef.current = !ctrlRef.current.alwIm;
        setLegalMove(legalMoveRef.current);
        setWhiteCtrl(ctrlRef.current.wctrl === user.id);
        setBlackCtrl(ctrlRef.current.bctrl === user.id);
        setScreenCtrl(ctrlRef.current?.sctrl === user.id);
        setParticipants(p => ([...p.map(e => ({...e, whiteCtrl: e.id === ctrlRef.current.wctrl, blackCtrl: e.id === ctrlRef.current.bctrl}))]));
        setActiveTools(a => {
          const tmp = a.filter(e => !['COR', 'PWN', 'HDE', 'SLM', 'AIM'].includes(e));
          ctrlRef.current.shwCs && tmp.push('COR');
          ctrlRef.current.shwPn && tmp.push('PWN');
          !ctrlRef.current.shwCn && tmp.push('HDE');
          ctrlRef.current.shwLm && tmp.push('SLM');
          ctrlRef.current.alwIm && tmp.push('AIM');          
          return tmp;
        });
        // setZoomMeetUrl(ctrlRef.current.zomlk);
        setMessages(ctrlRef.current.msges);
        setResponds(user.role !== 'G' ? ctrlRef.current.rspns : ctrlRef.current.rspns.filter(e => e.user === user.id));
        setQuestion(ctrlRef.current.qustn);
        setAnswers(user.role !== 'G' ? ctrlRef.current.ansrs : ctrlRef.current.ansrs.filter(e => e.user === user.id));
        setPoints(getPoints(ctrlRef.current.qustn, ctrlRef.current.ansrs, ctrlRef.current.pints));
        if (ctrlRef.current.prmvd === user.id) {
          clockRef.current && clearInterval(clockRef.current);
          setEnd({type: 'info', text: 'Session completed!'});
        }
      } else {
        clockRef.current && clearInterval(clockRef.current);
        user?.role === 'G' && setEnd({type: 'info', text: 'Session completed!'});
      } setProgress(false)
    });

    return () => {
      clockRef.current && clearInterval(clockRef.current);
      // if (sessn?.createdBy === user.id) sendData('ctrl', {jitsi: false});
      infoLstn()
      userLstn()
      set(child(userRef, `/${user.id}`), {online: false})
      sesnLstn();
      moveLstn();
      ctrlLstn();
      // chatLstn();
      // dataLstn();
    }
  }, []);

  const onShareScreenRefresh = useCallback(() => {
    setScreenCtrl(false)
    setTimeout(() => setScreenCtrl(ctrlRef.current.sctrl === user?.id))
  }, [user])

  const [exit, setExit] = useState(false)

  return (
    progress ? <Progress /> : <KeyboardAvoidingView style={{...s.f1, ...s.bc2}} behavior='padding' keyboardVerticalOffset={50}>
      {screenCtrl && <Sharescreen onRefresh={onShareScreenRefresh} />}
      {addParticipant && <AddParticipant onClose={() => setAddParticipant(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showPosition && <Position fen={fen} orientation={side} onChange={onFenChange} />}
      {askQuestion && <AskQuestion {...askQuestion} onChange={onAskQuestion} />}
      {exit && <Portal>
        <Dialog visible onDismiss={() => setExit(false)}>
          <Dialog.Content style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon source='location-exit' color='#F50057' size={24} />
            <Text style={{...s.cfff, ...s.fs18}}>Are you sure you want to Exit?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExit(false)}>No</Button>
            <Button onPress={() => onClose(sessn?.id, sesnRef.current?.start?.seconds)}>Yes</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>}
      <Header filter={false} title={sessn?.name} icon={<MaterialIcons name='live-tv' size={28} color='#87CEFA' />}>
        <Text style={{...s.cfff, ...s.fs18, ...s.mla}}>{parseTime(count)}</Text>
        {sessn?.createdBy === user.id && <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.p4, ...s.px8, ...s.br5, backgroundColor: '#87CEFA'}} onPress={() => setExit(true)}>
          <Text>EXIT</Text>
        </TouchableOpacity>}
      </Header>
      {!question && <>
        <Board
          sidetoplay
          drag={mode === 1 && (host || (whiteCtrl && game.turn() === 'w') || (blackCtrl && game.turn() === 'b') || (!legalMove && (whiteCtrl || blackCtrl)))}
          draw={mode === 2 && (host || (whiteCtrl && game.turn() === 'w') || (blackCtrl && game.turn() === 'b') || (!legalMove && (whiteCtrl || blackCtrl)))}
          coordinate={notation}
          orientation={side}
          invalidmove={!legalMove}
          fen={user?.role !== 'G' ? (showPawnStructure ? getPawnStructure(fen) : fen) : (showPieces ? (showPawnStructure ? getPawnStructure(fen) : fen) : '8/8/8/8/8/8/8/8 w - - 0 1')}
          lastmove={lastMove}
          symbols={arrows}
          pmoves={(legalMove && showLegalMoves) ? squares : []}
          onDrag={onDrag}
          onDrop={onDrop}
          onDraw={onDraw}
        />
        <Tool role={user.role} active={activeTools} onPress={onToolPress} />
        {host && <Puzzle onChange={onPuzzleChange} />}
      </>}
      <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={false} overScrollMode='never'>
        {question ? user.role === 'G' ? <SolveQuestion question={question} answers={answers} onSolve={onSolve} /> : <ViewQuestion participants={participants} question={question} answers={answers} onClose={onEndQuestion} /> : undefined}
        {sessn?.video === 1 && <Jitsi />}
        <ScrollView overScrollMode='never' style={{...s.mx8, ...s.mt4, ...s.mb8}} contentContainerStyle={s.g8} horizontal={true} showsHorizontalScrollIndicator={false}>
          {(host || showMoves) && <TouchableOpacity style={{...s.p8, ...s.br20, borderWidth: 2, borderColor: '#000', backgroundColor: tab === 1 ? '#F50057' : '#333'}} onPress={() => setTab(1)}>
            <Text style={{...s.cfff, ...s.fs15}}>MOVES</Text>
          </TouchableOpacity>}
          {(host || showChat) && <TouchableOpacity style={{...s.p8, ...s.br20, borderWidth: 2, borderColor: '#000', backgroundColor: tab === 2 ? '#F50057' : '#333'}} onPress={() => setTab(2)}>
            <Text style={{...s.cfff, ...s.fs15}}>CHAT</Text>
          </TouchableOpacity>}
          <TouchableOpacity style={{...s.p8, ...s.br20, borderWidth: 2, borderColor: '#000', backgroundColor: tab === 3 ? '#F50057' : '#333'}} onPress={() => setTab(3)}>
            <Text style={{...s.cfff, ...s.fs15}}>{host ? 'RESPONSE' : 'RESPOND'}</Text>
          </TouchableOpacity>
          {(host || showPoints) && <TouchableOpacity style={{...s.p8, ...s.br20, borderWidth: 2, borderColor: '#000', backgroundColor: tab === 4 ? '#F50057' : '#333'}} onPress={() => setTab(4)}>
            <Text style={{...s.cfff, ...s.fs15}}>LEADERBOARD</Text>
          </TouchableOpacity>}
          {host && <TouchableOpacity style={{...s.p8, ...s.br20, borderWidth: 2, borderColor: '#000', backgroundColor: tab === 5 ? '#F50057' : '#333'}} onPress={() => setTab(5)}>
            <Text style={{...s.cfff, ...s.fs15}}>PARTICIPANTS</Text>
          </TouchableOpacity>}
          {host && <TouchableOpacity style={{...s.p8, ...s.br20, borderWidth: 2, borderColor: '#000', backgroundColor: tab === 6 ? '#F50057' : '#333'}} onPress={() => setTab(6)}>
            <Text style={{...s.cfff, ...s.fs15}}>ENGINE</Text>
          </TouchableOpacity>}
        </ScrollView>
        <ScrollView overScrollMode='never' style={{height: 400}} nestedScrollEnabled={true}>
          {tab === 1 && (host || showMoves) && <Move moves={moves} index={index} onMove={onMove}/>}
          {tab === 2 && (host || showChat) && <Chat messages={messages} />}
          {(tab === 3 && !host) && <Respond responds={responds} />}
          {(tab === 3 && host) && <Response responds={responds} onResponse={onResponse} />}
          {(tab === 4 && (host || showPoints)) && <Leaderboard points={points} />}
          {(tab === 5 && host) && <Participant participants={participants} onControl={onControl} />}
          {(tab === 6 && host) && <Engine fen={fen} />}
        </ScrollView>
        {[2, 3].includes(tab) && <View style={{...s.mx8, ...s.fdr, ...s.aic, ...s.g8}}>
          <TextInput
            placeholderTextColor='#CCC'
            placeholder='Type Here...'
            value={message}
            onChangeText={setMessage}
            style={{
              ...s.f1,
              ...s.p4,
              ...s.px8,
              borderWidth: 1,
              color: '#FFF',
              borderColor: '#FFF'
            }}
          />
          <TouchableOpacity style={s.mr4} onPress={onSendMessage}>
            <FontAwesome name='send-o' color='#FFF' size={20} />
          </TouchableOpacity>
        </View>}
      </ScrollView>
    </KeyboardAvoidingView>
  ); 
};

export default memo(Room);