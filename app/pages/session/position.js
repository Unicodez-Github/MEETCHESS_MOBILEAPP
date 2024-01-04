import { useEffect, useRef, useState } from 'react';
import { Dimensions, Image as Img, Text as Txt, TouchableOpacity, TouchableWithoutFeedback, View, ScrollView, ToastAndroid } from 'react-native';
import { G, Image, Pattern, Rect, Svg, Text } from 'react-native-svg';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Chess } from 'chess.js';
import { fenToObj, objToFen, startFen } from '../../chess';
import { Header } from '../../factory';
import * as pieces from '../../../assets/pieces/default/*.png';
import s from '../../style';

const chess = new Chess();

const Position = ({fen=startFen, orientation='w', squarecolor='#FFFFDD-#86A666', onChange=()=>{}}) => {
  const posobj = useRef(fenToObj(fen));
  const rectArrRef = useRef([]);
  const piecesArrRef = useRef([]);
  const pieceRef = useRef(null);
  const [height] = useState(Math.min(Dimensions.get('window').width, Dimensions.get('window').height));
  const [size] = useState((height - 64) / 7);
  const [side, setSide] = useState(orientation);
  const [piece, setPiece] = useState(null);
  const [play, setPlay] = useState(null);
  const [K, setWk] = useState(null);
  const [Q, setWq] = useState(null);
  const [k, setBk] = useState(null);
  const [q, setBq] = useState(null);
  const [colors, setColors] = useState(['#FFFFDD', '#86A666']);
  const [rectArr, setRectArr] = useState([]);
  const [textArr, setTextArr] = useState([]);
  const [piecesArr, setPiecesArr] = useState([]);

  const onSet = () => {
    const fenstr = [objToFen(posobj.current), play, [K, Q, k, q].filter(e => e).join('') || '-', '-', '0', '1'].join(' ');
    if (fenstr === fen) return onChange(null);
    if (chess.validate_fen(fenstr).valid) return onChange(fenstr);
    ToastAndroid.show('Invalid Fen!', 500);
  };

  const onSquarePress = ({key, x, y}) => {
    if (pieceRef.current) {
      if (pieceRef.current === 'R' && posobj.current.hasOwnProperty(key)) {
        delete posobj.current[key];
        piecesArrRef.current = piecesArrRef.current.filter(p => !p.key.startsWith(key));
      } else {
        if (posobj.current.hasOwnProperty(key)) {
          piecesArrRef.current = piecesArrRef.current.filter(p => !p.key.startsWith(key));
        }
        posobj.current[key] = pieceRef.current;
        piecesArrRef.current.push({key: `${key}-${pieceRef.current}`, href: pieces[pieceRef.current], x, y});
      }
      setPiecesArr([...piecesArrRef.current]);
    }
  };

  const onPiecePress = (data) => {
    pieceRef.current = data;
    setPiece(data);
  };

  useEffect(() => {
    const [lgt, drk] = squarecolor.split('-');
    const ligt = /^#[0-9A-F]{6}$/i.test(lgt) ? lgt : '#FFFFDD';
    const dark = /^#[0-9A-F]{6}$/i.test(drk) ? drk : '#86A666';
    setColors([ligt, dark]);
  }, [squarecolor]);

  useEffect(() => {
    if (rectArr.length && fen) {
      const fenArr = fen.split(' ');
      const [K, Q, k, q] = fenArr[2].split('');
      setPlay(fenArr[1]); setWk(K); setWq(Q); setBk(k); setBq(q);
      piecesArrRef.current = Object.entries(posobj.current).map(([to, piece]) => {
        const {x, y} = rectArrRef.current.find(({key}) => key === to);
        return {key: `${to}-${piece}`, href: pieces[piece], x, y};
      });
      setPiecesArr([...piecesArrRef.current]);
    }
  }, [rectArr, fen]);

  useEffect(() => {
    const rectArr = [], textArr = [];
    const xaxis = side === 'w' ? 'abcdefgh' : 'hgfedcba';
    const yaxis = side === 'w' ? '87654321' : '12345678';
    yaxis.split('').forEach((y, i) => xaxis.split('').forEach((x, j) => {
      const obj = {key: `${x}${y}`, x: j * 100, y: i * 100};
      obj.onPress = () => onSquarePress(obj);
      rectArr.push(obj);
      if (j === 0) textArr.push({x: 2, y: (i * 100) + 62, text: y});
      if (i === 7) textArr.push({x: (j * 100) + 82, y: x === 'g' ? 835 : 840, text: x});
    }));
    rectArrRef.current = rectArr;
    setTextArr(textArr);
    setRectArr(rectArr);
  }, [side]);

  return (
    <View style={{...s.modal, ...s.bc2}}>
      <Header filter={false} title='Set Position' onBack={() => onChange()}>
        <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g4, ...s.mla, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={onSet}>
          <Feather name='check-circle' size={20} />
          <Txt>SET</Txt>
        </TouchableOpacity>
      </Header>
      <ScrollView showsVerticalScrollIndicator={false} style={s.mx8}>
        <View style={{height}}>
          <Svg viewBox='0 0 840 848'>
            {textArr.map(({ x, y, text }) => <Text key={text} x={x} y={y} fill='#FFF' fontFamily='system-ui' fontSize={isNaN(text) ? 32 : 30}>{text}</Text>)}
            <G x='40'>
              <Pattern id='square' x='0' y='0' width='200' height='200' patternUnits='userSpaceOnUse'>
                <Rect x='100' y='0' width='100' height='100' stroke={colors[1]} fill={colors[1]} />
                <Rect x='0' y='100' width='100' height='100' stroke={colors[1]} fill={colors[1]} />
              </Pattern>
              <Rect width='800' height='800' stroke={colors[1]} fill={colors[0]} />
              <Rect width='800' height='800' stroke={colors[1]} fill='url(#square)' />
              {piecesArr.map(props => <Image {...props} />)}
              {rectArr.map(props => <Rect width='100' height='100' fill='transparent' {...props} />)}
            </G>
          </Svg>
        </View>
        <View style={{...s.fdr, ...s.g8, ...s.my4}}>
          {'KQRBNP'.split('').map(e => <TouchableWithoutFeedback key={`w${e}`} onPress={() => onPiecePress(`w${e}`)}>
            <Img source={pieces[`w${e}`]} style={{...s.br5, borderColor: '#777', borderWidth: 2, width: size, height: size, backgroundColor: piece === `w${e}` ? '#87CEFA' : '#CCC'}} />
          </TouchableWithoutFeedback>)}
          <TouchableWithoutFeedback onPress={() => onPiecePress('R')}>
            <View style={{...s.aic, ...s.jcc, ...s.br5, borderColor: '#777', borderWidth: 2, width: size, height: size, backgroundColor: piece === 'R' ? '#87CEFA' : '#CCC'}}>
              <MaterialCommunityIcons name='close' color='#444' size={40} />
            </View>
          </TouchableWithoutFeedback>
        </View>
        <View style={{...s.fdr, ...s.g8, ...s.my4}}>
          {'KQRBNP'.split('').map(e => <TouchableWithoutFeedback key={`b${e}`} onPress={() => onPiecePress(`b${e}`)}>
            <Img source={pieces[`b${e}`]} style={{...s.br5, borderColor: '#777', borderWidth: 2, width: size, height: size, backgroundColor: piece === `b${e}` ? '#87CEFA' : '#CCC'}} />
          </TouchableWithoutFeedback>)}
          <TouchableOpacity onPress={() => setSide(s => s === 'w' ? 'b' : 'w')}>
            <View style={{...s.aic, ...s.jcc, ...s.bcc, ...s.br5, borderColor: '#777', borderWidth: 2, width: size, height: size}}>
              <MaterialCommunityIcons name='rotate-3d-variant' color='#444' size={40} />
            </View>
          </TouchableOpacity>
        </View>
        <View style={{...s.fdr, ...s.g8, ...s.my8}}>
          <View style={{...s.f1, ...s.br5, borderColor: '#777', borderWidth: 2}}>
            <View style={{...s.aic, ...s.p4, ...s.bcc, borderTopLeftRadius: 3, borderTopRightRadius: 3}}>
              <Txt numberOfLines={1}>SIDE TO PLAY</Txt>
            </View>
            <View style={{...s.fdr, ...s.p8, gap: 16}}>
              <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                <MaterialIcons name={play === 'w' ? 'radio-button-checked' : 'radio-button-unchecked'} size={26} color={play === 'w' ? '#87CEFA' : '#BBB'} onPress={() => setPlay('w')} />
                <Txt style={s.cbbb}>WHITE</Txt>
              </View>
              <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                <MaterialIcons name={play === 'b' ? 'radio-button-checked' : 'radio-button-unchecked'} size={26} color={play === 'b' ? '#87CEFA' : '#BBB'} onPress={() => setPlay('b')} />
                <Txt style={s.cbbb}>BLACK</Txt>
              </View>
            </View>
          </View>
        </View>
        <View style={{...s.fdr, ...s.g8, ...s.my8}}>
          <View style={{...s.f1, ...s.br5, borderColor: '#777', borderWidth: 2}}>
            <View style={{...s.aic, ...s.p4, ...s.bcc, borderTopLeftRadius: 3, borderTopRightRadius: 3}}>
              <Txt numberOfLines={1}>WHITE SIDE CASTLING</Txt>
            </View>
            <View style={{...s.p8, ...s.g4}}>
              <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                <MaterialIcons name={K === 'K' ? 'check-box' : 'check-box-outline-blank'} size={26} color={K === 'K' ? '#87CEFA' : '#BBB'} onPress={() => setWk(d => d ? null : 'K')} />
                <Txt style={{...s.cbbb, ...s.fs17}}>O-O</Txt>
              </View>
              <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                <MaterialIcons name={Q === 'Q' ? 'check-box' : 'check-box-outline-blank'} size={26} color={Q === 'Q' ? '#87CEFA' : '#BBB'} onPress={() => setWq(d => d ? null : 'Q')} />
                <Txt style={{...s.cbbb, ...s.fs17}}>O-O-O</Txt>
              </View>
            </View>
          </View>
          <View style={{...s.f1, ...s.br5, borderColor: '#777', borderWidth: 2}}>
            <View style={{...s.aic, ...s.p4, ...s.bcc, borderTopLeftRadius: 3, borderTopRightRadius: 3}}>
              <Txt numberOfLines={1}>BLACK SIDE CASTLING</Txt>
            </View>
            <View style={{...s.p8, ...s.g4}}>
              <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                <MaterialIcons name={k === 'k' ? 'check-box' : 'check-box-outline-blank'} size={26} color={k === 'k' ? '#87CEFA' : '#BBB'} onPress={() => setBk(d => d ? null : 'k')} />
                <Txt style={{...s.cbbb, ...s.fs17}}>O-O</Txt>
              </View>
              <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                <MaterialIcons name={q === 'q' ? 'check-box' : 'check-box-outline-blank'} size={26} color={q === 'q' ? '#87CEFA' : '#BBB'} onPress={() => setBq(d => d ? null : 'q')} />
                <Txt style={{...s.cbbb, ...s.fs17}}>O-O-O</Txt>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Position;
