import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { View, ToastAndroid, BackHandler } from 'react-native'
import { Icon, Portal, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SvgFromXml } from 'react-native-svg'
import { GestureDetector, Gesture, ScrollView } from 'react-native-gesture-handler'
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Chess } from 'chess.js'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { fenToObj, objToFen, startFen } from '../../chess'
import { Button, Dragged, Piece } from '../../components'
import * as pieces from '../../../assets/pieces/cburnett/*.svg'
import s from '../../style'

const chess = new Chess()

const spares = {
  '00': 'wK', '10': 'wQ', '20': 'wR', '30': 'wB', '40': 'wN', '50': 'wP', '60': 'wC',
  '01': 'bK', '11': 'bQ', '21': 'bR', '31': 'bB', '41': 'bN', '51': 'bP', '61': 'bF'
}

const Position = ({
  fen = startFen,
  squarecolor = '#FFFFDD-#86A666',
  textcolor = '#FFF',
  onChange = () => {}
}) => {
  const posx = useSharedValue(0)
  const posy = useSharedValue(0)
  const fx = useSharedValue(0)
  const fy = useSharedValue(0)
  const dragging = useSharedValue(0)
  const focusing = useSharedValue(0)
  const drgsorce = useSharedValue(null)
  const drgpiece = useSharedValue(null)
  const [K, setWk] = useState(null)
  const [Q, setWq] = useState(null)
  const [k, setBk] = useState(null)
  const [q, setBq] = useState(null)
  const [play, setPlay] = useState(null)
  const [piece, setPiece] = useState(null)
  const [width, setWidth] = useState(0)
  const [orientation, setOrientation] = useState('w')
  const [position, setPosition] = useState(fenToObj(fen))

  const onSet = () => {
    const fenstr = [objToFen(position), play, [K, Q, k, q].filter(e => e).join('') || '-', '-', '0', '1'].join(' ')
    if (fenstr === fen) return onChange(null)
    if (chess.validate_fen(fenstr).valid) return onChange(fenstr)
    ToastAndroid.show('Invalid Fen!', 500)
  }
  
  const size = useMemo(() => (width - 16) / 8, [width])

  const minVal = useMemo(() => size / 2, [size])

  const maxVal = useMemo(() => (8 * size) + minVal, [size, minVal])

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

  const getSquare = useCallback((x, y) => {
    'worklet'
    if (y > (8 * size)) {
      const nsiz = width / 7
      return ['AA', spares[`${Math.floor((x + 16) / nsiz)}${Math.floor((y - (8 * size) - 24) / nsiz)}`] || null]
    } else {
      const dx = Math.floor(x / size)
      const dy = Math.floor(y / size)
      const data = orientation === 'w' ? String.fromCharCode(97 + dx) + (8 - dy) : String.fromCharCode(104 - dx) + (1 + dy)
      const square = data.search(/^[a-h][1-8]$/) !== -1 ? data : null
      return [square, position[square] || null]
    }
  }, [orientation, position, width, size])

  const onLayout = useCallback((e) => {
    'worklet'
    setWidth(e?.nativeEvent?.layout?.width)
  }, [])

  const pieceAni = useAnimatedStyle(() => ({
    opacity: dragging.value,
    transform: [{
      translateX: posx.value
    }, {
      translateY: posy.value
    }]
  }))

  const sourceAni = useAnimatedStyle(() => ({
    opacity: fy.value ? 1 : 0,
    transform: [{
      translateX: fx.value
    }, {
      translateY: fy.value
    }]
  }))

  const targetAni = useAnimatedStyle(() => ({
    opacity: focusing.value,
    transform: [{
      translateX: Math.floor((posx.value + minVal - 16) / size) * size
    }, {
      translateY: Math.floor((posy.value + minVal) / size) * size
    }]
  }))

  const onSideChange = useCallback(() => {
    setOrientation(s => s === 'w' ? 'b' : 'w')
  }, [])

  const onDragBegin = useCallback((_, p) => {
    setPiece(p)
  }, [])

  const onDragEnd = useCallback((f, t, p) => {
    if (t && t !== 'AA') {
      setPosition(pos => {
        const data = {...pos}
        delete data[f]
        if (p !== 'wC') data[t] = p
        else delete data[t]
        return data
      })
    } setPiece(null)
  }, [])

  const gesture = Gesture.Pan().onBegin(e => {
    const [s, p] = getSquare(e.x - 16, e.y)
    if (p === 'bF') return runOnJS(onSideChange)()
    posx.value = e.x - size
    posy.value = e.y - size
    if (drgsorce.value && drgpiece.value && s) {
      runOnJS(onDragEnd)(drgsorce.value, s, drgpiece.value)
      fx.value = 0
      fy.value = 0
      drgsorce.value = null
      drgpiece.value = null
    } else if (s && p) {
      runOnJS(onDragBegin)(s, p)
      drgsorce.value = s
      drgpiece.value = p
      if (s !== 'AA') {
        const {x, y} = squares[s]
        fx.value = x
        fy.value = y
      }
    }
  }).onStart(_ => {
    dragging.value = drgsorce.value && drgpiece.value ? 1 : 0
  }).onUpdate(e => {
    if (drgpiece.value) {
      posx.value = e.x - size
      posy.value = e.y - size
      focusing.value = Math.min(e.x - 16, e.y) > minVal && Math.max(e.x - 16, e.y) < maxVal ? 1 : 0
    }
  }).onEnd(e => {
    posx.value = e.x - size
    posy.value = e.y - size
    const [s] = getSquare(Math.floor((posx.value + minVal - 16) / size) * size, Math.floor((posy.value + minVal) / size) * size)
    drgsorce.value && drgpiece.value && runOnJS(onDragEnd)(drgsorce.value, s, drgpiece.value)
    fx.value = 0
    fy.value = 0
    dragging.value = 0
    focusing.value = 0
    drgsorce.value = null
    drgpiece.value = null
  })

  useEffect(() => {
    if (fen) {
      const fenArr = fen.split(' ')
      const [K, Q, k, q] = fenArr[2].split('')
      setPlay(fenArr[1]), setWk(K), setWq(Q), setBk(k), setBq(q)
    }
  }, [fen])

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onChange(null)
      return true
    })
    
    return () => backHandler.remove()
  }, [])

  return (
    <Portal>
      <SafeAreaView style={{...s.fg1, ...s.bc3}}>
        <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.p8, ...s.bc2, paddingLeft: 4}}>
          <MaterialIcons name='app-registration' color='#87CEFA' size={30} />
          <Text variant='titleLarge' style={s.mra}>Set Position</Text>
          <Button text='clear' onPress={() => setPosition({})} icon={<Feather name='x' size={18} />} backgroundColor='#CCC' />
          <Button text='set' onPress={onSet} icon={<MaterialIcons name='check-circle-outline' size={20} style={{marginRight: 1}} />} />
        </View>
        <ScrollView overScrollMode='never' style={{...s.mx8, ...s.mt8}}>
          <View>
            <View onLayout={onLayout}>
              <View style={{width: 16, height: width - 16}}>
                {[...Array(8).keys()].map(y => <Text key={y} style={{...s.fg1, color: textcolor, verticalAlign: 'middle'}}>{orientation === 'w' ? 8 - y :  y + 1}</Text>)}
              </View>
              <View style={{...s.pna, top: 0, right: 0, bottom: 16, left: 16, backgroundColor: colors[1]}}>
                {[...Array(8).keys()].map(row => <View key={row} style={{...s.fg1, ...s.fdr}}>
                  {[...Array(8).keys()].map(col => <View key={col} style={{...s.fg1, backgroundColor: colors[(col + row % 2) % 2]}} />)}
                </View>)}
                <Animated.View style={[{...s.pna, width: size, height: size, borderWidth: 3, borderColor: 'red'}, sourceAni]} />
                <Animated.View style={[{...s.pna, width: size, height: size, borderWidth: 3, borderColor: 'red'}, targetAni]} />
                {Object.entries(position).map(([square, piece]) => <Piece key={square + piece} {...squares[square]} xml={pieces[piece]} size={size} opacity={square === drgsorce.value ? 0.2 : 1} />)}
              </View>
              <View style={{...s.fdr, height: 16, alignItems: 'flex-end'}}>
                <View style={{backgroundColor: colors[play === 'b' ? 1 : 0], width: 14, height: 14, borderRadius: 7}} />
                {[...Array(8).keys()].map(x => {
                  const text = String.fromCharCode(97 + (orientation === 'w' ? x : 7 - x))
                  return <Text key={x} style={{...s.fg1, ...s.tac, color: textcolor, marginTop: text === 'g' ? -2 : 0}}>{text}</Text>
                })}
              </View>
            </View>

            <View style={{...s.fdr, ...s.g8, ...s.my4, ...s.mt8, height: size}}>
              {'KQRBNPC'.split('').map(e => <View key={`w${e}`} style={{...s.fg1, ...s.br5, borderWidth: 2, borderColor: '#777', backgroundColor: piece === `w${e}` ? '#87CEFA' : '#CCC'}}>
                <SvgFromXml xml={pieces[`w${e}`]} height='100%' width='100%' viewBox='0 0 45 45' />
              </View>)}
            </View>

            <View style={{...s.fdr, ...s.g8, ...s.my4, ...s.mt8, height: size}}>
              {'KQRBNP'.split('').map(e => <View key={`b${e}`} style={{...s.fg1, ...s.br5, borderWidth: 2, borderColor: '#777', backgroundColor: piece === `b${e}` ? '#87CEFA' : '#CCC'}}>
                <SvgFromXml xml={pieces[`b${e}`]} height='100%' width='100%' viewBox='0 0 45 45' />
              </View>)}
              <View style={{...s.fg1, ...s.bcc, ...s.br5, borderWidth: 2, borderColor: '#777'}}>
                <SvgFromXml xml={pieces['wC']} height='100%' width='100%' viewBox='0 0 45 45' opacity={0} />
                <View style={{...s.pna, ...s.aic, ...s.jcc, top: 0, right: 0, bottom: 0, left: 0}}>
                  <Icon source='rotate-3d-variant' color='#E21B1B' size={34} />
                </View>
              </View>
            </View>

            <Dragged style={[pieceAni]} xml={pieces[piece]} size={size} />

            <GestureDetector gesture={gesture}>
              <View style={{...s.pna, top: 0, right: 0, bottom: 0, left: 0}} />
            </GestureDetector>
          </View>

          <View style={{...s.mt8, ...s.br5, ...s.p4, backgroundColor: '#AAA'}}>
            <View style={{...s.aic, ...s.p4}}>
              <Text style={{color: '#000'}}>SIDE TO PLAY</Text>
            </View>
            <View style={{...s.fdr, ...s.p8, ...s.bc3, gap: 16}}>
              <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                <MaterialIcons onPress={() => setPlay('w')} name={play === 'w' ? 'radio-button-checked' : 'radio-button-unchecked'} color={play === 'w' ? '#87CEFA' : '#BBB'} size={26} />
                <Text style={s.cbbb}>WHITE</Text>
              </View>
              <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.mra}}>
                <MaterialIcons onPress={() => setPlay('b')} name={play === 'b' ? 'radio-button-checked' : 'radio-button-unchecked'} color={play === 'b' ? '#87CEFA' : '#BBB'} size={26} />
                <Text style={s.cbbb}>BLACK</Text>
              </View>
              <Button text='start pos' onPress={() => setPosition(fenToObj(startFen))} icon={<MaterialCommunityIcons name='restart' size={24} />} backgroundColor='#AAA' />
            </View>
          </View>
          
          <View style={{...s.fdr, ...s.g8, marginTop: 12}}>
            <View style={{...s.fg1, ...s.br5, ...s.p4, backgroundColor: '#AAA'}}>
              <View style={{...s.aic, ...s.p4}}>
                <Text style={{color: '#000'}}>WHITE SIDE CASTLING</Text>
              </View>
              <View style={{...s.p8, ...s.bc3, ...s.g4}}>
                <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                  <MaterialIcons onPress={() => setWk(d => d ? null : 'K')} name={K === 'K' ? 'check-box' : 'check-box-outline-blank'} color={K === 'K' ? '#87CEFA' : '#BBB'} size={26} />
                  <Text style={s.cbbb}>O-O</Text>
                </View>
                <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                  <MaterialIcons onPress={() => setWq(d => d ? null : 'Q')} name={Q === 'Q' ? 'check-box' : 'check-box-outline-blank'} color={Q === 'Q' ? '#87CEFA' : '#BBB'} size={26} />
                  <Text style={s.cbbb}>O-O-O</Text>
                </View>
              </View>
            </View>
            <View style={{...s.fg1, ...s.br5, ...s.p4, backgroundColor: '#AAA'}}>
              <View style={{...s.aic, ...s.p4}}>
                <Text style={{color: '#000'}}>BLACK SIDE CASTLING</Text>
              </View>
              <View style={{...s.p8, ...s.bc3, ...s.g4}}>
                <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                  <MaterialIcons onPress={() => setBk(d => d ? null : 'k')} name={k === 'k' ? 'check-box' : 'check-box-outline-blank'} color={k === 'k' ? '#87CEFA' : '#BBB'} size={26} />
                  <Text style={s.cbbb}>O-O</Text>
                </View>
                <View style={{...s.fdr, ...s.aic, ...s.g8}}>
                  <MaterialIcons onPress={() => setBq(d => d ? null : 'q')} name={q === 'q' ? 'check-box' : 'check-box-outline-blank'} color={q === 'q' ? '#87CEFA' : '#BBB'} size={26} />
                  <Text style={s.cbbb}>O-O-O</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Portal>
  );
};

export default memo(Position)
