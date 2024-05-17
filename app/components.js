import { forwardRef, memo, useInsertionEffect } from 'react'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { Text } from 'react-native-paper'
import { SvgFromXml } from 'react-native-svg'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { aniConfig } from './constant'
import s from './style'

const Btn = ({
  text, icon, color = '#000', backgroundColor = '#87CEFA', onPress = () => {}
}) => <TouchableOpacity style={{
  ...s.fdr, ...s.aic, ...s.jcc, ...s.g2, ...s.br16, height: 32,
  backgroundColor, paddingRight: 10, paddingLeft: icon ? 7 : 10
}} onPress={onPress}>
  {icon}<Text style={{textTransform: 'uppercase', color}}>{text}</Text>
</TouchableOpacity>

const Pce = ({x, y, xml, size, opacity}) => <View style={{
  ...s.pna, opacity, transform: [{translateX: x}, {translateY: y}]}}>
  <SvgFromXml xml={xml} width={size} height={size} viewBox='0 0 45 45' />
</View>

const Drg = ({xml, size, style}, ref) => <View ref={ref} style={{
  ...s.pna, ...style, borderRadius: size, backgroundColor: '#7FFF00AA'}}>
  <SvgFromXml xml={xml} width={size} height={size} viewBox='0 0 45 45' />
</View>

const Rct = ({x, y, size, fill, stroke, opacity}) => <View style={{
  ...s.pna, width: size, height: size, backgroundColor: fill, borderWidth: 3,
  borderColor: stroke, transform: [{translateX: x}, {translateY: y}], opacity
}} />

const Arw = ({transform, points, fill}) => <SvgFromXml style={s.pna}
  xml={`<svg><polyline opacity='.8' stroke-width='8' transform='${transform}'
  points='${points}' fill='${fill}' stroke='${fill}' /></svg>`}
/>

const Cle = ({r, cx, cy, fill}) => <SvgFromXml style={s.pna}
  xml={`<svg><circle cx='${cx}' cy='${cy}' r='${r}' fill='${fill}' /></svg>`}
/>

const Apce = ({from, to, xml, size, opacity}) => {
  const x = useSharedValue(from?.x || 0)
  const y = useSharedValue(from?.y || 0)
  
  const pieceAni = useAnimatedStyle(() => ({
    opacity,
    transform: [{
      translateX: withTiming(x.value, aniConfig)
    }, {
      translateY: withTiming(y.value, aniConfig)
    }]
  }))

  useInsertionEffect(() => {
    x.value = to?.x
    y.value = to?.y
  }, [to])

  return (
    <Animated.View style={[s.pna, pieceAni]}>
      <SvgFromXml xml={xml} width={size} height={size} viewBox='0 0 45 45' />
    </Animated.View>
  )
}

export const Button = memo(Btn)
export const Piece = memo(Pce)
export const Rect = memo(Rct)
export const Arrow = memo(Arw)
export const Circle = memo(Cle)
export const Apiece = memo(Apce)
export const Dragged = Animated.createAnimatedComponent(memo(forwardRef(Drg)))
