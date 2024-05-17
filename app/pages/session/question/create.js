import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View, ScrollView, TextInput, KeyboardAvoidingView, BackHandler } from 'react-native';
import { Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Game } from '../../../chess';
import { Header } from '../../../factory';
import { defaultInput, startFen } from '../../../constant';
import Board from '../../../cboard';
import s from '../../../style';

const getPgn = (moves) => {
  return moves.filter(m => m && m.s && m.i && m.i !== '_').map(m => {
    let move = m.n ? `${m.n} ${m.s}` : m.s;
    if (m.v && m.v.length) m.v.forEach(v => move += ` (${getPgn(v)})`);
    return move;
  }).join(' ');
};

const AskQuestion = ({fen=startFen, pgn='', ans='', onChange=()=>{}}) => {
  const pgnRef = useRef(pgn);
  const [game] = useState(new Game(fen));
  const [pos, setPos] = useState(game.fen());
  const [turn, setTurn] = useState(game.turn());
  const [squares, setSquares] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [title, setTitle] = useState({...defaultInput, value: 'What is the best move?'});
  const [time, setTime] = useState({...defaultInput, value: '60'});
  const [score, setScore] = useState({...defaultInput, value: '10'});
  const [penalty, setPenalty] = useState({...defaultInput, value: '1'});
  const [attempt, setAttempt] = useState({...defaultInput, value: '0'});
  const [solution, setSolution] = useState({...defaultInput, value: ans});

  const onTitleChnage = (data) => {
    title.value = data;
    title.errtxt = data ? '' : 'Title is required.';
    setTitle({...title});
  };

  const onSolutionChnage = (data) => {
    solution.value = data;
    solution.errtxt = data ? '' : 'Solution is required.';
    setSolution({...solution});
  };

  const onAsk = () => {
    if (solution.value && title.value) {
      onChange({
        fen: fen,
        pgn: pgnRef.current,
        title: title.value,
        time: +(time.value || 60),
        score: +(score.value || 10),
        penalty: +(penalty.value || 0),
        maxAttempts: +(attempt.value || 0),
      });
    }
  };

  const onDown = useCallback((data) => {
    setSquares(game.possibleMoves(data));
  }, []);

  const onDrag = useCallback((square, piece) => {
    if (piece.at(0) === turn) {
      setSquares(game.possibleMoves(square));
      return true;
    } return false;
  }, [turn])

  const onDrop = useCallback((from, to) => {
    const data = {from, to};
    const move = game.move(data);
    if (move) {
      setPos(game.fen());
      setTurn(game.turn());
      setLastMove(move);
      pgnRef.current = game.content();
      onSolutionChnage(getPgn(game.moves()));
    } setSquares([]);
  }, []);

  const selectMove = (index) => {
    const move = game.selectMove(index);
    if (move) {
      setPos(game.fen());
      setTurn(game.turn());
      setLastMove(move);
      pgnRef.current = game.content();
      onSolutionChnage(getPgn(game.moves()));
    } setSquares([]);
  };

  const onMove = (key) => {
    if (key === 1) {
      const prev = game.prev();
      if (prev) selectMove(prev);
    } else if (key === 2) {
      const curr = game.moveIndex();
      const next = game.next();
      if (curr && next && curr.split('-').length === next.split('-').length) {
        selectMove(next);
      }
    } else if (key === 3) {
      const first = game.first();
      if (first) selectMove(first);
    } else if (key === 4) {
      const last = game.last();
      if (last) selectMove(last);
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onChange(null)
      return true
    })
    return () => backHandler.remove()
  }, [])

  return (
    <Portal>
      <SafeAreaView style={{...s.f1, ...s.bc2}}>
        <KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={50}>
          <Header icon={<MaterialCommunityIcons name='help-circle-outline' color='#87CEFA' size={32} />} filter={false} title='Ask Question'>
            <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g4, ...s.mla, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={onAsk}>
              <Feather name='check-circle' size={20} />
              <Text>ASK</Text>
            </TouchableOpacity>
          </Header>
          <ScrollView overScrollMode='never' showsVerticalScrollIndicator={false} style={s.mx8}>
            <Board
              drag
              sidetoplay
              fen={pos}
              pmoves={squares}
              lastmove={lastMove}
              onDrag={onDrag}
              onDrop={onDrop}
            />
            <View style={{...s.fdr, ...s.aic, ...s.jcc, ...s.g8, ...s.p4}}>
              <TouchableOpacity onPress={() => onMove(3)} style={{...s.aic, ...s.jcc, ...s.br5, ...s.bc3, height: 30, width: 30}}>
                <MaterialIcons name='fast-rewind' color='#87CEFA' size={26} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onMove(1)} style={{...s.aic, ...s.jcc, ...s.br5, ...s.bc3, height: 30, width: 30}}>
                <MaterialIcons name='skip-previous' color='#87CEFA' size={26} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onMove(2)} style={{...s.aic, ...s.jcc, ...s.br5, ...s.bc3, height: 30, width: 30}}>
                <MaterialIcons name='skip-next' color='#87CEFA' size={26} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onMove(4)} style={{...s.aic, ...s.jcc, ...s.br5, ...s.bc3, height: 30, width: 30}}>
                <MaterialIcons name='fast-forward' color='#87CEFA' size={26} />
              </TouchableOpacity>
            </View>
            <View style={s.my4}>
              <TextInput
                placeholderTextColor='#666'
                placeholder='Title'
                value={title.value}
                onChangeText={onTitleChnage}
                style={{
                  ...s.p6,
                  ...s.px8,
                  ...s.br5,
                  ...s.fs16,
                  borderWidth: 1,
                  color: '#FFF',
                  borderColor: '#CCC'
                }}
              />
              {title.errtxt && <Text style={{...s.p4, color: '#FF6D00'}}>{title.errtxt}</Text>}
            </View>
            <View style={s.my4}>
              <TextInput
                inputMode='numeric'
                placeholderTextColor='#666'
                placeholder='Max Time (Seconds)'
                value={time.value}
                onChangeText={setTime}
                style={{
                  ...s.p6,
                  ...s.px8,
                  ...s.br5,
                  ...s.fs16,
                  borderWidth: 1,
                  color: '#FFF',
                  borderColor: '#CCC'
                }}
              />
            </View>
            <View style={s.my4}>
              <TextInput
                inputMode='numeric'
                placeholderTextColor='#666'
                placeholder='Score'
                value={score.value}
                onChangeText={setScore}
                style={{
                  ...s.p6,
                  ...s.px8,
                  ...s.br5,
                  ...s.fs16,
                  borderWidth: 1,
                  color: '#FFF',
                  borderColor: '#CCC'
                }}
              />
            </View>
            <View style={s.my4}>
              <TextInput
                inputMode='numeric'
                placeholderTextColor='#666'
                placeholder='Negative Score'
                value={penalty.value}
                onChangeText={setPenalty}
                style={{
                  ...s.p6,
                  ...s.px8,
                  ...s.br5,
                  ...s.fs16,
                  borderWidth: 1,
                  color: '#FFF',
                  borderColor: '#CCC'
                }}
              />
            </View>
            <View style={s.my4}>
              <TextInput
                inputMode='numeric'
                placeholderTextColor='#666'
                placeholder='Max Attempts'
                value={attempt.value}
                onChangeText={setAttempt}
                style={{
                  ...s.p6,
                  ...s.px8,
                  ...s.br5,
                  ...s.fs16,
                  borderWidth: 1,
                  color: '#FFF',
                  borderColor: '#CCC'
                }}
              />
            </View>
            <View style={s.my4}>
              <TextInput
                editable={false}
                numberOfLines={1}
                placeholderTextColor='#666'
                placeholder='Solution'
                value={solution.value}
                onChangeText={onSolutionChnage}
                style={{
                  ...s.p6,
                  ...s.px8,
                  ...s.br5,
                  ...s.fs16,
                  borderWidth: 1,
                  color: '#FFF',
                  borderColor: '#CCC'
                }}
              />
              {/* <TouchableOpacity style={{...s.aic, ...s.jcc, position: 'absolute', top: 0, right: 0, bottom: 0, width: 40}} onPress={() => setEdit(true)}>
                <MaterialIcons name='edit' color='#87CEFA' size={24} />
              </TouchableOpacity> */}
              {solution.errtxt && <Text style={{...s.p4, color: '#FF6D00'}}>{solution.errtxt}</Text>}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Portal>
  );
};

export default AskQuestion;
