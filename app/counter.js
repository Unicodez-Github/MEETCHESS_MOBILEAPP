import { memo, useEffect, useRef, useState } from 'react'
import { parseTime } from './service';

const Counter = ({mode = 'up', start = 0, reset = 0, pause = false, onPause = () => {}, onEnd = () => {}}) => {
  const ref = useRef(null)
  const [count, setCount] = useState(null)

  useEffect(() => {
    if (ref.current) {
      if (count <= 0 || pause) {
        clearInterval(ref.current)
        ref.current = null
        if (pause) {
          onPause(count)
        } else {
          onEnd()
          setCount(null)
        }
      }
    }
  }, [count, pause, onEnd, onPause])

  useEffect(() => {
    if (start > 0 && !ref.current) {
      setCount(start)
      ref.current = setInterval(() => setCount(e => mode === 'up' ? ++e : --e), 1000)
    } else {
      setCount(null)
    }
    return () => {
      ref.current && clearInterval(ref.current)
      ref.current = null
    }
  }, [mode, start])

  useEffect(() => {
    if (!pause && !ref.current) {
      ref.current = setInterval(() => setCount(e => mode === 'up' ? ++e : --e), 1000)
    }
  }, [mode, pause])

  useEffect(() => {
    reset > 0 && setCount(start || null)
  }, [start, reset])

  return parseTime(count ? count : 0)
}

export default memo(Counter)
