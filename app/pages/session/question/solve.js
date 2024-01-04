import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { Text, View } from 'react-native';
import { parseTime, serverTime } from '../../../service';
import { UserState } from '../../../state';
import { Game } from '../../../chess';
import { Chip } from '../../../factory';
import Board from '../../../board';
import s from '../../../style';

const SolveQuestion = ({question=null, answers=[], onSolve=()=>{}}) => {
  const user = useRecoilValue(UserState);
  const counter = useRef(null);
  const timerRef = useRef(null);
  const ansRef = useRef(null);
  const timeRef = useRef(0);
  const attemptsRef = useRef(answers.filter(({ s }) => s === 0).length);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState(0);
  const [game] = useState(new Game());
  const [side, setSide] = useState(game.orientation());
  const [fen, setFen] = useState(game.fen());
  const [turn, setTurn] = useState(null);
  const [lastMove, setLastMove] = useState(null);

  const saveAnswer = (data) => {
    if (data.m) {
      onSolve({ ...data, t: timeRef.current, user: user.id });
    }
  };
  
  const onDrop = useCallback(async(data) => {
    const result = game.solve(data);
    if (result) {
      const { status, move, next } = result;
      if (status === 1) {
        const pgn = game.pgn();
        setTurn(game.turn());
        setFen(game.fen());
        setLastMove({ from: move.from, to: move.to });
        if (move.i === ansRef.current || !next || (move && next && move.i && next.i && move.i.split('-').length !== next.i.split('-').length)) {
          setTurn(null);
          saveAnswer({ f: game.fen(), m: pgn, s: status });
          setStatus(3);
        } else if (next) {
          saveAnswer({ f: game.fen(), m: pgn, s: 2 });
          setTimeout(() => {
            const res = game.solve({ s: next.s });
            const pgn = game.pgn();
            setTurn(game.turn());
            setFen(game.fen());
            setLastMove({ ...{ from: res.move.from, to: res.move.to } });
            if (res.move.i === ansRef.current || (res && !res.next) || (res && res.move && res.next && res.move.i && res.next.i && res.move.i.split('-').length !== res.next.i.split('-').length)) {
              setTurn(null);
              saveAnswer({ f: game.fen(), m: pgn, s: status });
              setStatus(3);
            } else {
              saveAnswer({ f: game.fen(), m: pgn, s: 2 });
              setStatus(1);
              setTimeout(() => setStatus(s => s === 1 ? 0 : s), 1000);
            }
          }, 500);
        }
      } else if (status === 0) {
        saveAnswer({ f: move.f, m: move.p, s: status });
        attemptsRef.current += 1;
        if (question.maxAttempts && +question.maxAttempts > 0 && attemptsRef.current >= +question.maxAttempts) {
          setTurn(null);
          setStatus(5);
        } else {
          setStatus(2);
        }
        setTimeout(() => setStatus(s => s === 2 ? 0 : s), 1000);
        setFen(game.fen());
      }
    }
  }, []);

  useEffect(() => {
    (async() => {
      game.load({ fen: question?.fen, moves: JSON.parse(question?.pgn) });
      ansRef.current = game.last();
      setSide(game.orientation());
      const solved = [...answers].reverse().find(({ s }) => s === 1);
      const lastMov = [...answers].reverse().find(({ s }) => s === 2);
      if (solved && solved.m && solved.m.length) {
        solved.m.split(' ').filter(e => e && !e.includes('.')).forEach(m => game.solve({ s: m }));
      } else if (lastMov && lastMov.m && lastMov.m.length) {
        lastMov.m.split(' ').filter(e => e && !e.includes('.')).forEach(m => game.solve({ s: m }));
      }
      setFen(game.fen());
      const timeElapsed = await serverTime() - question?.start?.seconds;
      const qstnTime = +question?.time - (timeElapsed > 0 ? timeElapsed : 0);
      const time = qstnTime > 0 ? qstnTime : 0;
      const attemptsUp = (question?.maxAttempts && +question?.maxAttempts > 0 && attemptsRef.current >= +question?.maxAttempts) ? true : false;
      setTurn((!solved && !attemptsUp && time && +time > 0) ? game.turn() : null);
      setStatus(solved ? 3 : attemptsUp ? 5 : (time && +time > 0) ? 0 : 4);
      if ((!solved && !attemptsUp && time && +time > 0)) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => ++timeRef.current, 1000);
      }
      if (time) {
        setCount(time);
        counter.current = setInterval(() => setCount(e => --e), 1000);
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (counter.current) clearInterval(counter.current);
    }
  }, []);

  useEffect(() => {
    if (counter.current && count < 1) {
      clearTimeout(counter.current);
      setTurn(null);
      setStatus(s => s === 3 ? 3 : 4);
    }
  }, [count]);

  return (
    <>
      <View style={{...s.f1, ...s.fdr, ...s.aic, ...s.mx8, ...s.g8, ...s.br5, ...s.bc3, ...s.p4}}>
        <Text style={{...s.cfff, ...s.fs16}} numberOfLines={1}>{question?.title}</Text>
        <Text style={{...s.cfff, ...s.fs18, ...s.mla}}>{parseTime(count)}</Text>
      </View>
      <View style={{...s.my8, ...s.asc}}>
        {status === 1 && <Chip type='success' text='Correct' />}
        {status === 2 && <Chip type='error' text='Incorrect' />}
        {status === 3 && <Chip type='success' text='Solved !' />}
        {status === 4 && <Chip text='Timeout !' />}
        {status === 5 && <Chip text='You have exceeded max attempts limit' />}
      </View>
      <Board
        side={side}
        turn={turn}
        fen={fen}
        lastmove={lastMove}
        onDrop={onDrop}
      />
      {turn && <View style={{...s.br20, ...s.p4, ...s.asc, ...s.my8, backgroundColor: '#87CEFA'}}>
        <Text style={s.fs16}>{turn === 'b' ? 'Black to move' : 'White to move'}</Text>
      </View>}
    </>
  );
};

export default SolveQuestion;
