import { View, useWindowDimensions } from 'react-native'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { WebView } from 'react-native-webview'
import s from '../style'

export const emptyFen = '8/8/8/8/8/8/8/8 w - - 0 1'

export const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function Chessfen({
  fen = startFen, orientation = 'w', color = null,
  allowPlaySound = true, lastMove = null, arrows = null
}) {
  const props = useRef({
    fen, orientation, color, lastMove, arrows, allowPlaySound,
    sparePosition: 'b', sparePieces: null, legalMoves: null,
    showCoordinate: false, showCurrentPlay: false, draggable: false,
    drawable: false, showPromotion: false, allowIllegalMove: false
  }), board = useRef()
  const [ready, setReady] = useState(false)

  const onLoad = () => {
    setReady(true), board.current?.postMessage(JSON.stringify({type: 0, data: props.current}))
  }

  useEffect(() => {
    if (ready && props.current.color !== color) {
      props.current.color = color
      board.current?.postMessage(JSON.stringify({type: 1, data: color}))
    }
  }, [ready, color])

  useEffect(() => {
    if (ready && props.current.orientation !== orientation) {
      props.current.orientation = orientation
      board.current?.postMessage(JSON.stringify({type: 6, data: orientation}))
    }
  }, [ready, orientation])

  useEffect(() => {
    if (ready && props.current.fen !== fen) {
      props.current.fen = fen
      board.current?.postMessage(JSON.stringify({type: 7, data: fen}))
    }
  }, [ready, fen])

  useEffect(() => {
    if (ready && props.current.lastMove !== lastMove) {
      props.current.lastMove = lastMove
      board.current?.postMessage(JSON.stringify({type: 9, data: lastMove}))
    }
  }, [ready, lastMove])

  useEffect(() => {
    if (ready && props.current.arrows !== arrows) {
      props.current.arrows = arrows
      board.current?.postMessage(JSON.stringify({type: 10, data: arrows}))
    }
  }, [ready, arrows])

  useEffect(() => {
    if (ready && props.current.allowPlaySound !== allowPlaySound) {
      props.current.allowPlaySound = allowPlaySound
      board.current?.postMessage(JSON.stringify({type: 15, data: allowPlaySound}))
    }
  }, [ready, allowPlaySound])

  return (
    <WebView useWebView2 ref={board}
      style={{backgroundColor: 'transparent'}}
      pointerEvents='none'
      overScrollMode='never'
      scrollEnabled={false}
      onLoad={onLoad}
      source={require('./board.html')}
    />
  )
}

function Chessboard({
  fen = startFen, orientation = 'w', sparePosition = 'b',
  lastMove = null, legalMoves = null, arrows = null,
  color = null, sparePieces = null, showCoordinate = true,
  showCurrentPlay = true, draggable = false, drawable = false,
  showPromotion = true, allowPlaySound = true, allowIllegalMove = false,
  onDrag = () => true, onDrop = () => true, onDraw = () => {},
  onAdd = () => {}, onFen = () => {}, onScroll = () => {}
}) {
  const props = useRef({
    fen, orientation, sparePosition, lastMove, legalMoves, arrows,
    color, sparePieces, showCoordinate, showCurrentPlay, draggable,
    drawable, showPromotion, allowPlaySound, allowIllegalMove
  }), board = useRef(), dimns = useWindowDimensions()
  const [ready, setReady] = useState(false)
  const [height, setHeight] = useState()

  const width = useMemo(() => Math.min(dimns.width, dimns.height), [dimns.width, dimns.height])

  const onLoad = () => {
    setReady(true), board.current?.postMessage(JSON.stringify({type: 0, data: props.current}))
  }

  const onTouch = (event) => {
    onScroll(), event.preventDefault(), event.stopPropagation()
  }

  const onMessage = ({nativeEvent}) => {
    const {type, data} = JSON.parse(nativeEvent?.data)
    if (type === 0) {
      setHeight(data.CH)
    } else if (type === 1) {
      onDrag(data)
    } else if (type === 2) {
      const back = onDrop(data)
      back && board.current?.postMessage(JSON.stringify({type: 16, data}))
    } else if (type === 3) {
      onDraw(data)
    } else if (type === 4) {
      onAdd(data)
    } else if (type === 5) {
      onFen(data)
    }
  }

  useEffect(() => {
    if (ready && props.current.color !== color) {
      props.current.color = color
      board.current?.postMessage(JSON.stringify({type: 1, data: color}))
    }
  }, [ready, color])

  useEffect(() => {
    if (ready && props.current.showCoordinate !== showCoordinate) {
      props.current.showCoordinate = showCoordinate
      board.current?.postMessage(JSON.stringify({type: 2, data: showCoordinate}))
    }
  }, [ready, showCoordinate])

  useEffect(() => {
    if (ready && props.current.showCurrentPlay !== showCurrentPlay) {
      props.current.showCurrentPlay = showCurrentPlay
      board.current?.postMessage(JSON.stringify({type: 3, data: showCurrentPlay}))
    }
  }, [ready, showCurrentPlay])

  useEffect(() => {
    if (ready && props.current.sparePieces !== sparePieces) {
      props.current.sparePieces = sparePieces
      board.current?.postMessage(JSON.stringify({type: 4, data: sparePieces}))
    }
  }, [ready, sparePieces])

  useEffect(() => {
    if (ready && props.current.sparePosition !== sparePosition) {
      props.current.sparePosition = sparePosition
      board.current?.postMessage(JSON.stringify({type: 5, data: sparePosition}))
    }
  }, [ready, sparePosition])

  useEffect(() => {
    if (ready && props.current.orientation !== orientation) {
      props.current.orientation = orientation
      board.current?.postMessage(JSON.stringify({type: 6, data: orientation}))
    }
  }, [ready, orientation])

  useEffect(() => {
    if (ready && props.current.fen !== fen) {
      props.current.fen = fen
      board.current?.postMessage(JSON.stringify({type: 7, data: fen}))
    }
  }, [ready, fen])

  useEffect(() => {
    if (ready && props.current.legalMoves !== legalMoves) {
      props.current.legalMoves = legalMoves
      board.current?.postMessage(JSON.stringify({type: 8, data: legalMoves}))
    }
  }, [ready, legalMoves])

  useEffect(() => {
    if (ready && props.current.lastMove !== lastMove) {
      props.current.lastMove = lastMove
      board.current?.postMessage(JSON.stringify({type: 9, data: lastMove}))
    }
  }, [ready, lastMove])

  useEffect(() => {
    if (ready && props.current.arrows !== arrows) {
      props.current.arrows = arrows
      board.current?.postMessage(JSON.stringify({type: 10, data: arrows}))
    }
  }, [ready, arrows])

  useEffect(() => {
    if (ready && props.current.draggable !== draggable) {
      props.current.draggable = draggable
      board.current?.postMessage(JSON.stringify({type: 11, data: draggable}))
    }
  }, [ready, draggable])

  useEffect(() => {
    if (ready && props.current.drawable !== drawable) {
      props.current.drawable = drawable
      board.current?.postMessage(JSON.stringify({type: 12, data: drawable}))
    }
  }, [ready, drawable])

  useEffect(() => {
    if (ready && props.current.allowIllegalMove !== allowIllegalMove) {
      props.current.allowIllegalMove = allowIllegalMove
      board.current?.postMessage(JSON.stringify({type: 13, data: allowIllegalMove}))
    }
  }, [ready, allowIllegalMove])

  useEffect(() => {
    if (ready && props.current.showPromotion !== showPromotion) {
      props.current.showPromotion = showPromotion
      board.current?.postMessage(JSON.stringify({type: 14, data: showPromotion}))
    }
  }, [ready, showPromotion])

  useEffect(() => {
    if (ready && props.current.allowPlaySound !== allowPlaySound) {
      props.current.allowPlaySound = allowPlaySound
      board.current?.postMessage(JSON.stringify({type: 15, data: allowPlaySound}))
    }
  }, [ready, allowPlaySound])

  return (
    <View style={[s.asc, width, height]}>
      <WebView useWebView2 ref={board}
        style={{backgroundColor: 'transparent'}}
        pointerEvents='none'
        overScrollMode='never'
        scrollEnabled={false}
        onLoad={onLoad}
        onMessage={onMessage}
        onTouchStart={onTouch}
        source={require('./board.html')}
      />
    </View>
  )
}

export const Fen = memo(Chessfen)
export const Board = memo(Chessboard)
