import { memo, useCallback, useInsertionEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { SvgFromXml } from 'react-native-svg'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { fenToObj, getPosition, startFen } from './chess'
import { Apiece, Arrow, Circle, Rect } from './components'
import { aniConfig } from './constant'
import { playSound } from './service'
import * as svgpieces from '../assets/pieces/cburnett/*.svg'
import s from './style'

let pos = {}

const Board = ({
  drag = false,
  draw = false,
  coordinate = true,
  sidetoplay = false,
  invalidmove = false,
  orientation = 'w',
  squarecolor = '#D9FDF8-#62B1A8',
  textcolor = '#FFF',
  fen = startFen,
  symbols = null,
  pmoves = null,
  lastmove = null,
  onDrag = () => {},
  onDrop = () => {},
  onDraw = () => {}
}) => {
  const fenref = useRef()
  const margin = useSharedValue(0)
  const txtopa = useSharedValue(0)
  const ciropa = useSharedValue(0)
  const promtn = useSharedValue(0)
  const dragx = useSharedValue(0)
  const dragy = useSharedValue(0)
  const dragging = useSharedValue(0)
  const drgsorce = useSharedValue(null)
  const drgpiece = useSharedValue(null)
  const [width, setWidth] = useState(0)
  const [source, setSource] = useState(null)
  const [draged, setDraged] = useState(null)
  const [move, setMove] = useState(null)

  const size = useMemo(() => (width - ((coordinate || sidetoplay) ? 16 : 0)) / 8, [coordinate, sidetoplay, width])

  const minVal = useMemo(() => size / 2, [size])

  const maxVal = useMemo(() => (8 * size) + minVal, [size, minVal])

  const turn = useMemo(() => fen ? (fen === 'start' ? 'w' : fen.split(' ')[1]) : null, [fen])

  const colors = useMemo(() => {
    const [w, b] = squarecolor.split('-')
    const ligt = /^#[0-9A-F]{6}$/i.test(w) ? w : '#D9FDF8'
    const dark = /^#[0-9A-F]{6}$/i.test(b) ? b : '#62B1A8'
    return [ligt, dark]
  }, [squarecolor])

  const squares = useMemo(() => {
    const obj = {}
    const xaxis = orientation === 'w' ? 'abcdefgh' : 'hgfedcba'
    const yaxis = orientation === 'w' ? '87654321' : '12345678'
    yaxis.split('').forEach((y, i) => xaxis.split('').forEach((x, j) => {
      obj[`${x}${y}`] = {x: j * size, y: i * size}
    }))
    return obj
  }, [orientation, size])

  const pieces = useMemo(() => {
    if (fen) {
      let position = fenToObj(fen)
      let {data, captured} = getPosition(pos, position)
      pos = position
      if (fen !== fenref.current) playSound(captured)
      fenref.current = fen
      if (move) {
        let obj = data.find(d => d.to === move)
        if (obj) obj.from = move
      } setMove(null)
      return data
    } return []
  }, [fen, move])

  const arrows = useMemo(() => (symbols || []).filter(s => s.f && s.t).map(s => {
    if (s.f === s.t) {
      return {...squares[s.f], fill: s?.c || '#EB6150'}
    } else {
      const {x: fx, y: fy} = squares[s.f]
      const {x: tx, y: ty} = squares[s.t]
      const dx = tx - fx, dy = ty - fy
      const lenth = Math.hypot(dx, dy) + 8
      return {
        fill: s?.c || '#FFAA00',
        transform: `rotate(${Math.abs((Math.atan2(dx, dy) * 180 / Math.PI) - 180) - 90}, ${fx + minVal}, ${fy + minVal})`,
        points: `${fx + minVal},${fy + minVal} ${fx + lenth},${fy + minVal} ${fx + lenth},${fy + (minVal / 1.25)} ${fx + lenth + 6},${fy + minVal} ${fx + lenth},${fy + minVal + (minVal / 5)} ${fx + lenth},${fy + minVal}`
      }
    }
  }), [symbols, squares, minVal])

  const moves = useMemo(() => (pmoves || []).map(m => {
    const {x, y} = squares[m]
    return {cx: x + minVal, cy: y + minVal, r: (minVal / (pos[m] ? 1 : 3))}
  }), [pmoves, pos, squares, minVal])

  const getSquare = useCallback((x, y) => {
    'worklet'
    const dx = Math.floor(x / size)
    const dy = Math.floor(y / size)
    const data = orientation === 'w' ? String.fromCharCode(97 + dx) + (8 - dy) : String.fromCharCode(104 - dx) + (1 + dy)
    const square = data.search(/^[a-h][1-8]$/) !== -1 ? data : null
    return [square, pos[square] || null]
  }, [orientation, pos, size])

  const onLayout = useCallback((e) => {
    'worklet'
    setWidth(e?.nativeEvent?.layout?.width)
  }, [])

  const textAni = useAnimatedStyle(() => ({
    opacity: withTiming(txtopa.value, aniConfig)
  }))

  const circleAni = useAnimatedStyle(() => ({
    opacity: withTiming(ciropa.value, aniConfig)
  }))

  const boardAni = useAnimatedStyle(() => ({
    left: withTiming(margin.value, aniConfig),
    bottom: withTiming(margin.value, aniConfig)
  }))

  const gestrAni = useAnimatedStyle(() => ({
    left: margin.value,
    bottom: margin.value,
    backgroundColor: promtn.value ? '#00000099' : ''
  }))

  const pieceAni = useAnimatedStyle(() => ({
    transform: [{
      translateX: dragx.value
    }, {
      translateY: dragy.value
    }]
  }))

  const targetAni = useAnimatedStyle(() => ({
    opacity: dragging.value,
    transform: [{
      translateX: Math.floor((dragx.value + minVal) / size) * size
    }, {
      translateY: Math.floor((dragy.value + minVal) / size) * size
    }]
  }))

  const onDragBegin = useCallback((fm, fp, dg) => {
    dg && onDrag(fm, fp)
    setSource(fm)
  }, [onDrag])

  const onDragStart = useCallback((_, fp) => {
    setDraged(fp)
  }, [])

  const onDragEnd = useCallback((fm, to, fp, tp, mv) => {
    setSource(null)
    setDraged(null)
    if (drag && !draw && fm && to && fp && onDrop(fm, to)) {
      mv && setMove(to)
    } else if (draw && !drag && fm && to) {
      onDraw(fm, to)
    }
  }, [drag, draw, onDrop, onDraw])

  const gesture = Gesture.Pan().onBegin(e => {
    const [s, p] = getSquare(e.x, e.y)
    if (drgsorce.value && drgpiece.value) {
      runOnJS(onDragEnd)(drgsorce.value, s, drgpiece.value, p)
      dragging.value = 0
      drgsorce.value = null
      drgpiece.value = null
    } else if (drag && !draw && s && p && (turn === p[0] || invalidmove)) {
      runOnJS(onDragBegin)(s, p, true)
      drgsorce.value = s
      drgpiece.value = p
    } else if (draw && !drag && s) {
      runOnJS(onDragBegin)(s, p)
      drgsorce.value = s
      drgpiece.value = 'wA'
    }
  }).onStart(_ => {
    drgsorce.value && drgpiece.value && runOnJS(onDragStart)(drgsorce.value, drgpiece.value)
  }).onUpdate(e => {
    if (drgsorce.value && drgpiece.value) {
      dragx.value = e.x - size
      dragy.value = e.y - size
      dragging.value = Math.min(e.x, e.y) > minVal && Math.max(e.x, e.y) < maxVal ? 1 : 0
    }
  }).onEnd(e => {
    const [s, p] = getSquare(Math.floor((e.x - minVal) / size) * size, Math.floor((e.y - minVal) / size) * size)
    drgsorce.value && drgpiece.value && runOnJS(onDragEnd)(drgsorce.value, s, drgpiece.value, p, true)
    dragging.value = 0
    drgsorce.value = null
    drgpiece.value = null
  })

  useInsertionEffect(() => {
    margin.value = (coordinate || sidetoplay) ? 16 : 0
    txtopa.value = coordinate ? 1 : 0
    ciropa.value = sidetoplay ? 1 : 0
  }, [coordinate, sidetoplay])

  return (
    <View onLayout={onLayout}>
      <View style={{width: 16, height: width - 16}}>
        {[...Array(8).keys()].map(y => <Animated.Text key={y} style={[{...s.fg1, color: textcolor, verticalAlign: 'middle'}, textAni]}>{orientation === 'w' ? 8 - y :  y + 1}</Animated.Text>)}
      </View>
      <Animated.View style={[{...s.pna, top: 0, right: 0, backgroundColor: colors[1]}, boardAni]}>
        {[...Array(8).keys()].map(row => <View key={row} style={{...s.fg1, ...s.fdr}}>
          {[...Array(8).keys()].map(col => <View key={col} style={{...s.fg1, backgroundColor: colors[(col + row % 2) % 2]}} />)}
        </View>)}
        <Animated.View style={[{...s.pna, width: size, height: size, borderWidth: 3, borderColor: 'red'}, targetAni]} />
        {source && <Rect {...squares[source]} size={size} stroke='red' />}
        {lastmove?.from && <Rect {...squares[lastmove.from]} size={size} stroke='blue' />}
        {lastmove?.to && <Rect {...squares[lastmove.to]} size={size} stroke='blue' />}
        {arrows.filter(a => !a.points).map((props, i) => <Rect key={i} {...props} size={size} stroke='transparent' />)}
        {moves.map((props, i) => <Circle key={i} {...props} fill='deeppink' />)}
        {pieces.map(({from, to, piece}) => <Apiece key={from + to + piece} from={squares[from]} to={squares[to]} xml={svgpieces[piece]} size={size} opacity={(drag && !draw && to === source) ? 0.2 : 1} />)}
        {arrows.filter(a => a.points).map((props, i) => <Arrow key={i} {...props} />)}
        {draged && <Animated.View style={[{...s.pna, borderRadius: size, backgroundColor: '#7FFF00AA'}, pieceAni]}>
          <SvgFromXml xml={svgpieces[draged]} width={size} height={size} viewBox='0 0 45 45' />
        </Animated.View>}
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{...s.pna, top: 0, right: 0}, gestrAni]} />
      </GestureDetector>
      <View style={{...s.fdr, height: 16, alignItems: 'flex-end'}}>
        <Animated.View style={[{backgroundColor: colors[turn === 'b' ? 1 : 0], width: 14, height: 14, borderRadius: 7}, circleAni]} />
        {[...Array(8).keys()].map(x => {
          const text = String.fromCharCode(97 + (orientation === 'w' ? x : 7 - x))
          return <Animated.Text key={x} style={[{...s.fg1, ...s.tac, color: textcolor, marginTop: text === 'g' ? -2 : 0}, textAni]}>{text}</Animated.Text>
        })}
      </View>
    </View>
  )
}

export default memo(Board)
