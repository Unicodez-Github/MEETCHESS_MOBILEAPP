import { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, View } from 'react-native';
import { G, Image, Pattern, Rect, Svg, Text } from 'react-native-svg';
import { fenToObj, getAnimations, startFen } from './chess';
import * as pieces from '../assets/pieces/default/*.png';
import s from './style';

const { width, height } = Dimensions.get('window');

const Piece = Animated.createAnimatedComponent(Image);

const ChessPiece = memo(({ type, tx, ty, ...props }) => {
  const value = useRef(type === '2' ? new Animated.ValueXY({ x: props.x, y: props.y }) : new Animated.Value(type === '1' ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(value, { toValue: type === '2' ? { x: tx, y: ty } : type === '1' ? 1 : 0, duration: 100, useNativeDriver: true }).start();
  }, []);
  return type === '2' ? <Piece {...props} {...value} /> : <Piece {...props} opacity={value} />;
});

const Board = ({
  coordinate = false,
  orientation = 'w',
  squarecolor = '#FFFFDD-#86A666',
  textcolor = '#FFF',
  fen = startFen
}) => {
  const posobj = useRef({});
  const rectArrRef = useRef([]);
  const piecesArrRef = useRef([]);
  const [size] = useState(Math.min(width, height));
  const [ready, setReady] = useState(false);
  const [colors, setColors] = useState(['#FFFFDD', '#86A666']);
  const [rectArr, setRectArr] = useState([]);
  const [textArr, setTextArr] = useState([]);
  const [piecesArr, setPiecesArr] = useState([]);

  const setPosition = (data) => {
    const position = fenToObj(data);
    const { rem, add, mov } = getAnimations(posobj.current, position);
    posobj.current = position;
    if (rem.length) {
      rem.forEach(({ from, piece }) => {
        const obj = piecesArrRef.current.find(({ id }) => id === `${from}-${piece}`);
        if (obj) { obj.type = '3'; }
      });
    }
    if (add.length) {
      add.forEach(({ to, piece }) => {
        const { x, y } = rectArrRef.current.find(({ key }) => key === to);
        piecesArrRef.current.push({ x, y, type: '1', id: `${to}-${piece}`, href: pieces[piece]});
      });
    }
    if (mov.length) {
      mov.forEach(({ from, to, piece }) => {
        const obj = piecesArrRef.current.find(({ id }) => id === `${from}-${piece}`);
        const { x, y } = rectArrRef.current.find(({ key }) => key === to);
        if (obj) { obj.type = '2'; obj.tx = x; obj.ty = y; obj.id = `${to}-${piece}`; }
      });
    }
    setPiecesArr([...piecesArrRef.current]);
    piecesArrRef.current = piecesArrRef.current.filter(e => e.type !== '3').map(({ tx, ty, ...obj }) => {
      if (tx >= 0 && ty >= 0) { obj.x = tx; obj.y = ty; } return obj;
    });
    setTimeout(() => setReady(true));
  };

  useEffect(() => {
    rectArr.length && fen && setPosition(fen);
  }, [rectArr, fen]);

  useEffect(() => {
    const rectArr = [], textArr = [];
    const xaxis = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
    const yaxis = orientation === 'w' ? '87654321' : '12345678';
    yaxis.split('').forEach((y, i) => xaxis.split('').forEach((x, j) => {
      const obj = { key: `${x}${y}`, x: j * 100, y: i * 100 };
      obj.onPress = () => onSquarePress(obj);
      rectArr.push(obj);
      if (j === 0) textArr.push({ x: 2, y: (i * 100) + 62, text: y });
      if (i === 7) textArr.push({ x: (j * 100) + 82, y: x === 'g' ? 835 : 840, text: x });
    }));
    posobj.current = {};
    piecesArrRef.current = [];
    rectArrRef.current = rectArr;
    setRectArr(rectArr);
    setTextArr(textArr);
  }, [orientation]);

  useEffect(() => {
    const [lgt, drk] = squarecolor.split('-');
    const ligt = /^#[0-9A-F]{6}$/i.test(lgt) ? lgt : '#FFFFDD';
    const dark = /^#[0-9A-F]{6}$/i.test(drk) ? drk : '#86A666';
    setColors([ligt, dark]);
  }, [squarecolor]);

  return (
    <View style={{height: size, width: size, padding: 8}}>
      <Svg viewBox={`0 0 ${coordinate ? 840 : 800} ${coordinate ? 848 : 800}`}>
        {textArr.map(({ x, y, text }) => <Text key={text} x={x} y={y} fontSize={isNaN(text) ? 32 : 30} fill={textcolor} fontFamily='system-ui'>{text}</Text>)}
        <G x={coordinate ? 40 : 0}>
          <Pattern id='square' x='0' y='0' width='200' height='200' patternUnits='userSpaceOnUse'>
            <Rect x='100' y='0' width='100' height='100' stroke={colors[1]} fill={colors[1]} />
            <Rect x='0' y='100' width='100' height='100' stroke={colors[1]} fill={colors[1]} />
          </Pattern>
          <Rect width='800' height='800' stroke={colors[1]} fill={colors[0]} />
          <Rect width='800' height='800' stroke={colors[1]} fill='url(#square)' />
          {piecesArr.map((props, i) => <ChessPiece key={i + props.id + props.type} {...props} />)}
        </G>
      </Svg>
      {!ready && <View style={{...s.layer, ...s.bc2}}>
        <ActivityIndicator style={s.fg1} size={40} />
      </View>}
    </View>
  )
};

export default memo(Board);
