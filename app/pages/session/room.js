import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { KeyboardAvoidingView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { arrayUnion, doc, increment, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { onDisconnect, onValue, ref, update } from 'firebase/database';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { db, rdb } from '../../firebase';
import { createDoc, parseTime, saveAnswer, serverTime } from '../../service';
import { startFen } from '../../constant';
import { Header, Progress } from '../../factory';
import { Game, getPawnStructure } from '../../chess';
import { SessnState, UserState, UsersState } from '../../state';
import Board from '../../board';
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

const Room = () => {
  const user = useRecoilValue(UserState);
  const users = useRecoilValue(UsersState);
  const counter = useRef(null);
  const moveRef = useRef(null);
  const ctrlRef = useRef(null);
  const chatRef = useRef(null);
  const dataRef = useRef(null);
  const squaresRef = useRef([]);
  const legalMoveRef = useRef(true);
  const [game] = useState(new Game());
  const [progress, setProgress] = useState(true);
  const [count, setCount] = useState(0);
  const [sessn, setSessn] = useRecoilState(SessnState);
  const [participants, setParticipants] = useState(users.filter(({id}) => sessn?.createdBy !== id && sessn?.participants.includes(id)).map(({id, name, role}) => ({id, name, role, joined: false, whiteCtrl: false, blackCtrl: false})));
  const [notation, setNotation] = useState(true);
  const [mode, setMode] = useState(null);
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
  const [jitsi, setJitsi] = useState(false);
  const [jitsiReload, setJitsiReload] = useState(false);
  const [whiteCtrl, setWhiteCtrl] = useState(false);
  const [blackCtrl, setBlackCtrl] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showMoves, setShowMoves] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [showPieces, setShowPieces] = useState(true);
  const [showPawnStructure, setShowPawnStructure] = useState(false);
  const [showLegalMoves, setShowLegalMoves] = useState(false);
  const [showPosition, setShowPosition] = useState(false);
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

  const [message, setMessage] = useState(null);

  const sendData = async(docId, data) => {
    let result = false;
    try {
      await updateDoc(doc(db, 'sessions', sessn?.id, 'room', docId), data);
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
        const user = dataRef.current.pints.find(e => e && e.user && e.user === id);
        return user ? { ...user, attempt: 0 } : { user: id, name, point: 0, attempt: 0 };
      })];
      await sendData('data', { qustn: { ...data, id: quesId, start: serverTimestamp() }, pints, ansrs: [] });
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
      await sendData('data', { qustn: null, pints: points, ansrs: [] });
      setProgress(false);
    } return true;
  }, [question, answers, points, participants]);

  const onSolve = useCallback((data) => {
    sendData('data', { ansrs: arrayUnion(data) });
  }, []);

  const onFenChange = useCallback((fenstr) => {
    setShowPosition(false);
    if (fenstr) {
      sendData('move', {fen: fenstr, index: '_', moves: [{i: '_', f: fenstr}], z: increment(1)});
      saveGame({fen: game.startFen(), moves: game.content()});
    }
  }, []);

  const onPuzzleClose = useCallback((data) => {
    setShowGameLoad(false);
    if (data) {
      if (typeof data === 'string') {
        onFenChange(data);
      } else {
        if (Math.floor(JSON.stringify(data).length / 1000000) === 0) {
          const temp = new Game();
          temp.load({fen: data.fen, moves: JSON.parse(data.moves)});
          sendData('move', {fen: data.fen, index: '_', moves: temp.history(), z: increment(1), side: true});
          saveGame({fen: game.startFen(), moves: game.content()});
        } else {
          setMsg({type: 'info', text: 'Please split the PGN since the size is more than 1 MB'});
        }
      }
    }
  }, []);

  const onControl = useCallback((data) => {
    sendData('ctrl', data);
  }, []);

  const onResponse = useCallback((data) => {
    sendData('chat', { rspns: data });
  }, []);

  const onMove = useCallback((index) => sendData('move', {index, z: increment(1)}), []);

  const onDown = useCallback((data) => {
    squaresRef.current = game.possibleMoves(data);
    setSquares(squaresRef.current);
  }, []);

  const onDrop = useCallback(async(data) => {
    const move = game.move(data, !legalMoveRef.current && !squaresRef.current.includes(data.to));
    if (move) {
      setFen(game.fen());
      setMoves(game.moves());
      setIndex(game.moveIndex());
      setTurn(game.turn());
      setLastMove(move);
      const update = typeof move === 'string' ? {index: move} : {index: move.i, moves: [...moveRef.current.moves, move]};
      const res = sendData('move', {...update, z: increment(1)});
      if (!res) {
        setMoves(game.setMoves(moveRef.current.moves));
        const move = game.selectMove(moveRef.current.index);
        if (move) {
          setFen(game.fen());
          setMoves(game.moves());
          setIndex(game.moveIndex());
          setTurn(game.turn());
          setLastMove(move);
        }
      }
    }
    setSquares([]);
    setArrows([]);
  }, []);

  const onDraw = useCallback((data) => {
    setArrows(a => [...a.filter(({f, t}) => !(f === data.f && t === data.t)), data]);
  }, []);

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
        const md = m === 2 ? null : 2;
        setActiveTools(a => {
          const at = md ? [...new Set(a.concat('ARW'))] : a.filter(e => e !== 'ARW');
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
    }
  }, []);

  useEffect(() => {
    const userStatusRef = ref(rdb, `/sessn/${sessn?.id}`);

    const userLstn = onValue(userStatusRef, (snap) => {
      if (snap.exists()) {
        const online = Object.entries(snap.val()).map(([key, _]) => key);
        setParticipants(data => ([...data.map(e => ({...e, joined: online.includes(e.id)}))]));     
      } else {
        setParticipants(data => ([...data.map(e => ({...e, joined: false}))]));
      }
    });

    const moveLstn = onSnapshot(doc(db, 'sessions', sessn?.id, 'room', 'move'), async(snap) => {
      if (snap.exists) {
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
          }
          setSquares([]);
          setArrows([]);
        } else {
          const move = game.loadHistory({fen, moveIndex, history});
          if (move) {
            setSide(game.orientation());
            setFen(game.fen());
            setMoves(game.moves());
            setIndex(game.moveIndex());
            setTurn(game.turn());
            setLastMove(move);
          }
          setSquares([]);
          setArrows([]);
        } moveRef.current = snap.data();
      }
    });

    const ctrlLstn = onSnapshot(doc(db, 'sessions', sessn?.id, 'room', 'ctrl'), async(snap) => {
      if (snap.exists) {
        if (!ctrlRef.current) {
          const {start} = snap.data();
          const count = await serverTime() - start?.seconds;
          if (count > 0) {
            setCount(count);
            counter.current = setInterval(() => setCount(e => ++e), 1000);
          }
        }
        ctrlRef.current = snap.data();
        setJitsi(ctrlRef.current.jitsi);
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
      } else {
        user?.role === 'G' && setEnd({type: 'info', text: 'Session completed!'});
      }
    });

    const chatLstn = onSnapshot(doc(db, 'sessions', sessn?.id, 'room', 'chat'), async(snap) => {
      if (snap.exists) {
        chatRef.current = snap.data();
        setZoomMeetUrl(chatRef.current.zomlk);
        setMessages(chatRef.current.msges);
        setResponds(user.role !== 'G' ? chatRef.current.rspns : chatRef.current.rspns.filter(e => e.user === user.id));
      }
    });

    const dataLstn = onSnapshot(doc(db, 'sessions', sessn?.id, 'room', 'data'), async(snap) => {
      if (snap.exists) {
        if (!dataRef.current) setProgress(false);
        dataRef.current = snap.data();
        setQuestion(dataRef.current.qustn);
        setAnswers(user.role !== 'G' ? dataRef.current.ansrs : dataRef.current.ansrs.filter(e => e.user === user.id));
        setPoints(getPoints(dataRef.current.qustn, dataRef.current.ansrs, dataRef.current.pints));
        if (dataRef.current.prmvd === user.id) {
          setEnd({type: 'info', text: 'Session completed!'});
        }
      }
    });
    
    onDisconnect(userStatusRef).update({[user.id]: null}).then(() => {
      update(userStatusRef, {[user.id]: true});
    });

    return () => {
      if (counter.current) clearTimeout(counter.current);
      if (sessn?.createdBy === user.id) sendData('ctrl', {jitsi: false});
      update(userStatusRef, {[user.id]: null});
      userLstn();
      moveLstn();
      ctrlLstn();
      chatLstn();
      dataLstn();
    }
  }, []);

  return (
    progress ? <Progress /> : <KeyboardAvoidingView style={{...s.f1, ...s.bc2}} behavior='padding' keyboardVerticalOffset={50}>
      {showPosition && <Position onChange={onFenChange} />}
      {askQuestion && <AskQuestion {...askQuestion} onChange={onAskQuestion} />}
      <Puzzle open={showGameLoad} onClose={onPuzzleClose}/>
      <Header filter={false} title={sessn?.name} icon={<MaterialIcons name='live-tv' size={28} color='#F50057' />} onBack={() => setSessn(null)}>
        <Text style={{...s.cfff, ...s.fs18, ...s.mla}}>{parseTime(count)}</Text>
        <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.p4, ...s.px8, ...s.br5, backgroundColor: '#F50057'}}>
          <Text>EXIT</Text>
        </TouchableOpacity>
      </Header>
      <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
        {question ? user.role === 'G' ? <SolveQuestion question={question} answers={answers} onSolve={onSolve} /> : <ViewQuestion participants={participants} question={question} answers={answers} onClose={onEndQuestion} /> : <>
          <Board
            notation={notation}
            side={side}
            mode={mode}
            turn={turn}
            fen={user?.role !== 'G' ? (showPawnStructure ? getPawnStructure(fen) : fen) : (showPieces ? (showPawnStructure ? getPawnStructure(fen) : fen) : '8/8/8/8/8/8/8/8 w - - 0 1')}
            squares={(legalMove && showLegalMoves) ? squares : []}
            arrows={arrows}
            lastmove={lastMove}
            legalmove={legalMove}
            onDown={onDown}
            onDrop={onDrop}
            onDraw={onDraw}
          />
          <Tool role={user.role} active={activeTools} onPress={onToolPress} />
        </>}
        {sessn?.video === 1 && <Jitsi />}
        <ScrollView style={{...s.mx8, ...s.mt4, ...s.mb8}} contentContainerStyle={s.g8} horizontal={true} showsHorizontalScrollIndicator={false}>
          {['MOVES', 'CHAT', 'RESPOND', 'RESPONSE', 'PARTICIPANTS', 'LEADERBOARD', 'ENGINE'].map((e, i) => 
            <TouchableOpacity key={i} style={{...s.p8, ...s.br20, borderWidth: 2, borderColor: '#000', backgroundColor: tab === i + 1 ? '#F50057' : '#333'}} onPress={() => setTab(i + 1)}>
            <Text style={{...s.cfff, ...s.fs15}}>{e}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        <ScrollView style={{height: 400}} nestedScrollEnabled={true}>
          {tab === 1 && <Move moves={moves} index={index} onMove={onMove}/>}
          {tab === 2 && <Chat messages={messages} />}
          {tab === 3 && <Respond responds={responds} />}
          {(tab === 4 && user.role !== 'G') && <Response responds={responds} onResponse={onResponse} />}
          {(tab === 5 && user.role !== 'G') && <Participant participants={participants} onControl={onControl} />}
          {(tab === 6 && user.role !== 'G') && <Leaderboard points={points} />}
          {(tab === 7 && user.role !== 'G') && <Engine fen={fen} />}
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

export default Room;