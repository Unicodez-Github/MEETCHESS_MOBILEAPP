import { useCallback, useRef, useState } from 'react';
import { Text, TouchableOpacity, View, ScrollView, TextInput, KeyboardAvoidingView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Game } from '../../../chess';
import { Header } from '../../../factory';
import { defaultInput, startFen } from '../../../constant';
import Board from '../../../board';
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

  const onDrop = useCallback(async(data) => {
    const move = game.move(data);
    if (move) {
      setPos(game.fen());
      setTurn(game.turn());
      setLastMove(move);
      pgnRef.current = game.content();
      onSolutionChnage(getPgn(game.moves()));
    } setSquares([]);
  }, []);

  return (
    <KeyboardAvoidingView style={{...s.modal, ...s.bc2}} behavior='padding' keyboardVerticalOffset={50}>
      <Header filter={false} title='Ask Question' onBack={() => onChange()}>
        <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g4, ...s.mla, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={onAsk}>
          <Feather name='check-circle' size={20} />
          <Text>ASK</Text>
        </TouchableOpacity>
      </Header>
      <ScrollView showsVerticalScrollIndicator={false} style={s.mx8}>
        <Board
          turn={turn}
          fen={pos}
          squares={squares}
          lastmove={lastMove}
          onDown={onDown}
          onDrop={onDrop}
        />
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
  );
};

export default AskQuestion;
