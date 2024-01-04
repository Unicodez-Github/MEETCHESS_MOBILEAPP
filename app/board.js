import { Fragment, memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, View } from 'react-native';
import { Circle, G, Image, Pattern, Polyline, Rect, Svg, Text } from 'react-native-svg';
import { fenToObj, getAnimations, startFen } from './chess';
import * as pieces from '../assets/pieces/default/*.png';
import s from '../app/style';

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
  notation = true,
  side = 'w',
  squarecolor = '#FFFFDD-#86A666',
  textcolor = '#FFF',
  fen = startFen,
  mode = null,
  turn = null,
  lastmove = null,
  arrows = null,
  squares = null,
  legalmove = true,
  onDown = () => {},
  onDrop = () => {},
  onDraw = () => {}
}) => {
  const fenstr = useRef(fen);
  const posobj = useRef({});
  const rectArrRef = useRef([]);
  const piecesArrRef = useRef([]);
  const modeRef = useRef(null);
  const turnRef = useRef(null);
  const fromRef = useRef(null);
  const legalMoveRef = useRef(null);
  const [size] = useState(Math.min(width, height));
  const [ready, setReady] = useState(false);
  const [colors, setColors] = useState(['#FFFFDD', '#86A666']);
  const [rectArr, setRectArr] = useState([]);
  const [textArr, setTextArr] = useState([]);
  const [piecesArr, setPiecesArr] = useState([]);
  const [highArr, setHighArr] = useState([]);
  const [arrwArr, setArrwArr] = useState([]);
  const [sqrsArr, setSqrsArr] = useState([]);
  const [lastMove, setLastMove] = useState([]);
  const [movFrom, setMovFrom] = useState(null);
  const [arrFrom, setArrFrom] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const [promotionArr, setPromotionArr] = useState([]);

  const onPromote = (data) => {
    setPromotion(null);
    if (data && fromRef.current) {
      onDrop({ ...data, from: fromRef.current });
    } else {
      setPosition(fenstr.current);
    } fromRef.current = null;
  };

  const onSquarePress = ({key, x, y}) => {
    if (modeRef.current === 1) {
      onDraw({ f: key, t: key });
    } else if (modeRef.current === 2) {
      if (fromRef.current) {
        onDraw({ f: fromRef.current, t: key });
        fromRef.current = null;
        setArrFrom(null);
      } else {
        fromRef.current = key;
        setArrFrom({ points: `${x + 50},${y + 90} ${x + 50},${y + 35} ${x + 40},${y + 35} ${x + 50},${y + 22} ${x + 60},${y + 35} ${x + 50},${y + 35}` });
      }
    } else {
      if (fromRef.current) {
        if ((posobj.current[fromRef.current] === 'wP' && fromRef.current.charAt(1) === '7' && key.charAt(1) === '8') || (posobj.current[fromRef.current] === 'bP' && fromRef.current.charAt(1) === '2' && key.charAt(1) === '1')) {
          setMovFrom(null);
          setPiecesArr(piecesArrRef.current.filter(({ id }) => ![`${fromRef.current}-wP`, `${fromRef.current}-bP`].includes(id)));
          setPromotion(key);
          setSqrsArr([]);
        } else if (fromRef.current !== key) {
          const piece = posobj.current[key];
          if (legalMoveRef.current && piece && piece.charAt(0) === turnRef.current) {
            fromRef.current = key;
            onDown(fromRef.current);
            setMovFrom({ x, y });
          } else {
            onDrop({ from: fromRef.current, to: key });
            setMovFrom(null);
            fromRef.current = null;
          }
        }
      } else {
        const piece = posobj.current[key];
        if (piece && (!legalMoveRef.current || (legalMoveRef.current && piece.charAt(0) === turnRef.current))) {
          fromRef.current = key;
          onDown(fromRef.current);
          setMovFrom({ x, y });
        }
      }
    }
  };

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
    legalMoveRef.current = legalmove;
  }, [legalmove]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    if (!(mode && modeRef.current)) {
      setHighArr([]);
      setArrwArr([]);
    }
    setSqrsArr([]);
    setMovFrom(null);
    setArrFrom(null);
    modeRef.current = mode;
    fromRef.current = null;
  }, [mode]);

  useEffect(() => {
    const [lgt, drk] = squarecolor.split('-');
    const ligt = /^#[0-9A-F]{6}$/i.test(lgt) ? lgt : '#FFFFDD';
    const dark = /^#[0-9A-F]{6}$/i.test(drk) ? drk : '#86A666';
    setColors([ligt, dark]);
  }, [squarecolor]);

  useEffect(() => {
    const rectArr = [], textArr = [];
    const xaxis = side === 'w' ? 'abcdefgh' : 'hgfedcba';
    const yaxis = side === 'w' ? '87654321' : '12345678';
    yaxis.split('').forEach((y, i) => xaxis.split('').forEach((x, j) => {
      const obj = { key: `${x}${y}`, x: j * 100, y: i * 100 };
      obj.onPress = () => onSquarePress(obj);
      rectArr.push(obj);
      if (j === 0) textArr.push({ x: 2, y: (i * 100) + 62, text: y });
      if (i === 7) textArr.push({ x: (j * 100) + 82, y: x === 'g' ? 835 : 840, text: x });
    }));
    rectArrRef.current = rectArr;
    setRectArr(rectArr); setTextArr(textArr);
    if (fromRef.current) {
      const { ...obj } = rectArrRef.current.find(({ key }) => key === fromRef.current);
      fromRef.current = null;
      onSquarePress(obj);
    }
  }, [side]);

  useEffect(() => {
    if (rectArr.length && fen) {
      fenstr.current = fen;
      setPosition(fenstr.current);
    }
  }, [rectArr, fen]);

  useEffect(() => {
    if (rectArr.length && lastmove && lastmove.from && lastmove.to) {
      const { x: fx, y: fy } = rectArrRef.current.find(({ key }) => key === lastmove.from);
      const { x: tx, y: ty } = rectArrRef.current.find(({ key }) => key === lastmove.to);
      setLastMove([{ x: fx + 5, y: fy + 5 }, { x: tx + 5, y: ty + 5 }]);
    } else {
      setLastMove([]);
    }
  }, [rectArr, lastmove]);

  useEffect(() => {
    if (rectArr.length && Array.isArray(squares) && squares.length) {
      const sqrsArr = [];
      squares.forEach(s => {
        const sqr = rectArrRef.current.find(({ key }) => key === s);
        if (sqr) {
          if (posobj.current.hasOwnProperty(sqr.key)) {
            sqrsArr.push({ cx: sqr.x + 50, cy: sqr.y + 50, r: 50 });
          } else {
            sqrsArr.push({ cx: sqr.x + 50, cy: sqr.y + 50, r: 16 });
          }
        }
      });
      setSqrsArr(sqrsArr);
    } else {
      setSqrsArr([]);
    }
  }, [rectArr, squares]);

  useEffect(() => {
    if (rectArr.length && Array.isArray(arrows) && arrows.length) {
      const highArr = [], arrwArr = [];
      arrows.forEach(({ f, t, c }) => {
        const { x: fx, y: fy } = rectArrRef.current.find(({ key }) => key === f);
        if (f === t) {
          highArr.push({ x: fx, y: fy, fill: c || '#EB6150' });
        } else {
          const { x: tx, y: ty } = rectArrRef.current.find(({ key }) => key === t);
          const dx = tx - fx, dy = ty - fy;
          const lenth = Math.hypot(dx, dy) + 20;
          const transform = `rotate(${Math.abs((Math.atan2(dx, dy) * 180 / Math.PI) - 180) - 90}, ${fx + 50}, ${fy + 50})`;
          const points = `${fx + 50},${fy + 50} ${fx + lenth},${fy + 50} ${fx + lenth},${fy + 40} ${fx + lenth + 15},${fy + 50} ${fx + lenth},${fy + 60} ${fx + lenth},${fy + 50}`;
          arrwArr.push({ transform, points, stroke: c || '#FFAA00' });
        }
      });
      setHighArr(highArr); setArrwArr(arrwArr);
    } else {
      setHighArr([]); setArrwArr([]);
    }
  }, [rectArr, arrows]);

  useEffect(() => {
    if (rectArr.length && promotion) {
      const { x, y } = rectArrRef.current.find(({ key }) => key === promotion);
      const c = promotion.charAt(1) === '8' ? 'w' : 'b';
      const arr = ['Q', 'N', 'R', 'B', null].map((p, i) => {
        const f = y === 0 ? 100 : -100;
        const obj = { x: x, y: (f * i) + y };
        const data = p ? { to: promotion, promotion: p.toLowerCase() } : null;
        obj.onPress = () => onPromote(data);
        if (p) {
          obj.href = pieces[c + p];
        } else {
          obj.x = x + 34;
          obj.y = obj.y + 66;
        } return obj;        
      });
      setPromotionArr([{ x, y: y === 0 ? y : 300 }, ...arr]);
    } else {
      setPromotionArr([]);
    }
  }, [rectArr, promotion]);

  return (
    <View style={{height: size, width: size, padding: 8}}>
      <Svg viewBox={`0 0 ${notation ? 840 : 800} ${notation ? 848 : 800}`}>
        {textArr.map(({ x, y, text }) => <Text key={text} x={x} y={y} fontSize={isNaN(text) ? 32 : 30} fill={textcolor} fontFamily='system-ui'>{text}</Text>)}
        <G x={notation ? 40 : 0}>
          <Pattern id='square' x='0' y='0' width='200' height='200' patternUnits='userSpaceOnUse'>
            <Rect x='100' y='0' width='100' height='100' stroke={colors[1]} fill={colors[1]} />
            <Rect x='0' y='100' width='100' height='100' stroke={colors[1]} fill={colors[1]} />
          </Pattern>
          <Rect width='800' height='800' stroke={colors[1]} fill={colors[0]} />
          <Rect width='800' height='800' stroke={colors[1]} fill='url(#square)' />
          {sqrsArr.map((props, i) => <Circle key={i} fill='deeppink' {...props} />)}
          {highArr.map((props, i) => <Rect key={i} width='100' height='100' opacity='0.8' {...props} />)}
          {movFrom && <Rect x={movFrom.x} y={movFrom.y} width='100' height='100' fill='#7FFF00' />}
          {lastMove.map((props, i) => <Rect key={i} width='90' height='90' stroke='blue' strokeWidth='5' fill='transparent' {...props} />)}
          {piecesArr.map((props, i) => <ChessPiece key={i + props.id + props.type} {...props} />)}
          {arrwArr.map((props, i) => <Polyline key={i} strokeWidth='15' opacity='0.8' {...props} />)}
          {arrFrom && <Polyline stroke='deeppink' strokeWidth='15' points={arrFrom.points} />}
          {rectArr.map(props => <Rect width='100' height='100' fill='transparent' {...props} />)}
          {promotionArr.length > 0 && <>
            <Rect x={rectArr.at(0).x} y={rectArr.at(0).y} width='800' height='800' fill='#000' opacity='0.7' />
            {promotionArr.map((props, i) => <Fragment key={i}>
              {i === 0 ? <Rect x={props.x} y={props.y} width='100' height='500' fill='#DDD' /> : props.href ? <Image {...props} /> : <Text fontWeight='500' fontSize='50' fill='red' fontFamily='system-ui' {...props}>X</Text>}
            </Fragment>)}
          </>}
        </G>
      </Svg>
      {!ready && <View style={{...s.layer, ...s.bc2}}>
        <ActivityIndicator style={s.fg1} size={40} />
      </View>}
    </View>
  );
};

export default memo(Board);
