import { useCallback, useEffect, useRef, useState } from 'react'
import { View, BackHandler, ScrollView, TouchableOpacity } from 'react-native'
import { Button, Dialog, Icon, IconButton, Portal, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useRecoilValue } from 'recoil'
import { arrayUnion, collection, doc, getDocs, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { child, onDisconnect, onValue, ref, set } from 'firebase/database'
import { getDocById, timeOffset } from '../../service'
import { apiCall, db, rdb } from '../../firebase'
import { Empty, Progress, Toast } from '../../factory'
import { emptyFen, Game } from '../../chess'
import { UserState, UsersState } from '../../state'
import { Board } from '../chess'
import Counter from '../../counter'
import s from '../../style'
import dayjs from 'dayjs'

export default function Live({docId = null, onClose = () => {}}) {
  const tab = useRef('xxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))).current
  const game = useRef(new Game()).current
  const timeoffset = useRef(0)
  const tnmntRef = useRef(null)
  const roundRef = useRef(null)
  const movesRef = useRef([])
  const whiteCountRef = useRef(null)
  const blackCountRef = useRef(null)

  const user = useRecoilValue(UserState)
  const students = useRecoilValue(UsersState)
  const [ready, setReady] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [onlineusers, setOnlineUsers] = useState([])
  
  const [msg, setMsg] = useState(null)
  const [progress, setProgress] = useState(true)
  const [board, setBoard] = useState(null)
  const [result, setResult] = useState(null)
  const [whiteClock, setWhiteClock] = useState(null)
  const [blackClock, setBlackClock] = useState(null)
  const [whitePause, setWhitePause] = useState(true)
  const [blackPause, setBlackPause] = useState(true)
  const [whiteTimeOut, setWhiteTimeOut] = useState(false)
  const [blackTimeOut, setBlackTimeOut] = useState(false)
  const [whiteCtrl, setWhiteCtrl] = useState(false)
  const [blackCtrl, setBlackCtrl] = useState(false)
  const [orientation, setOrientation] = useState('w')
  const [fen, setFen] = useState(emptyFen)
  const [move, setMove] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [drawAsked, setDrawAsked] = useState(false)
  const [showDraw, setShowDraw] = useState(false)
  const [draw, setDraw] = useState(false)
  const [showResign, setShowResign] = useState(false)
  const [resign, setResign] = useState(false)
  const [refresh, setRefresh] = useState(1)

  const onRefresh = () => {
    whiteCountRef.current = null
    blackCountRef.current = null
    movesRef.current = []
    setMsg(null)
    setProgress(true)
    setBoard(null)
    setResult(null)
    setWhiteClock(null)
    setBlackClock(null)
    setWhitePause(true)
    setBlackPause(true)
    setWhiteTimeOut(false)
    setBlackTimeOut(false)
    setWhiteCtrl(false)
    setBlackCtrl(false)
    setOrientation('w')
    setFen(emptyFen)
    setMove(null)
    setLastMove(null)
    setDrawAsked(false)
    setShowDraw(false)
    setDraw(false)
    setShowResign(false)
    setResign(false)
    setRefresh(e => ++e)
  }

  const onResign = (data) => {
    setShowResign(false)
    if (data) {
      setWhitePause(true)
      setBlackPause(true)
      setResign(true)
    }
  }

  const onAnswerDraw = (data) => {
    setShowDraw(false)
    if (data) {
      setWhitePause(true)
      setBlackPause(true)
      setDraw(true)
    } else {
      setBoardData({drawAsked: false})
    }
  }

  const setBoardData = useCallback(async(data) => {
    if (board?.id) {
      await updateDoc(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${board?.id}`), data)
      return true
    } return false
  }, [board, docId])

  const onWhiteClockEnd = useCallback(() => {
    setWhitePause(true)
    setBlackPause(true)
    setWhiteTimeOut(true)
  }, [])

  const onBlackClockEnd = useCallback(() => {
    setWhitePause(true)
    setBlackPause(true)
    setBlackTimeOut(true)
  }, [])

  const onWhiteClockPause = useCallback((data) => {
    whiteCountRef.current = data
  }, [])

  const onBlackClockPause = useCallback((data) => {
    blackCountRef.current = data
  }, [])

  const onDrop = useCallback(({piece, ...data}) => {
    if (!result && board) {
      if (data?.from && data?.to && piece && data?.from !== data?.to) {
        const move = game.move(data)
        if (!move) return 'back'
        if (game.isGameOver() || movesRef.current.map(e => e.f).filter(e => e.startsWith(move.f.split(' ').slice(0, 3).join(' '))).length >= 3) {
          setWhitePause(true)
          setBlackPause(true)
        } else {
          const turn = game.turn()
          setWhitePause(turn === 'b')
          setBlackPause(turn === 'w')
        }
        setMove(move)
        setFen(game.fen())
        setLastMove(move)
      }
    }
  }, [result, board])

  useEffect(() => {
    if (!result && board && move) {
      const data = { moves: arrayUnion(move), updatedAt: serverTimestamp(), drawAsked: false }
      const turn = game.turn()
      if (turn === 'b') {
        data.whiteTime = `${whiteCountRef.current + (+tnmntRef.current?.increment || 0)}`
        setWhiteClock(+data.whiteTime)
      } else {
        data.blackTime = `${blackCountRef.current + (+tnmntRef.current?.increment || 0)}`
        setBlackClock(+data.blackTime)
      }
      if (game.isGameOver() || movesRef.current.map(e => e.f).filter(e => e.startsWith(move.f.split(' ').slice(0, 3).join(' '))).length >= 3) {
        const mate = game.isCheckMate()
        data.result = mate ? (turn === 'w' ? '0-1' : '1-0') : '1/2-1/2'
        data.status = mate ? '4' : game.isStaleMate() ? '8' : game.isThreeFoldRepetition() ? '9' : game.isInsufficientMaterial() ? '10' : '11'
      }
      setBoardData(data)
      setMove(null)
    }
  }, [result, board, move, setBoardData])

  useEffect(() => {
    if (!result && resign && board && orientation) {
      setBoardData({
        result: orientation === 'w' ? '0-1' : '1-0',
        status: '5',
        whiteTime: `${whiteCountRef.current}`,
        blackTime: `${blackCountRef.current}`,
        updatedAt: serverTimestamp()
      })
      setResign(false)
    }
  }, [result, resign, board, orientation, setBoardData])

  useEffect(() => {
    if (!result && draw && board && orientation) {
      setBoardData({
        result: '1/2-1/2',
        status: orientation === 'b' ? '6' : '7',
        whiteTime: `${whiteCountRef.current}`,
        blackTime: `${blackCountRef.current}`,
        updatedAt: serverTimestamp()
      })
      setDraw(false)
    }
  }, [result, draw, board, orientation, setBoardData])

  useEffect(() => {
    if (!result && board && (whiteTimeOut || blackTimeOut)) {
      setBoardData({
        result: whiteTimeOut ? '0-1' : '1-0',
        status: '3',
        whiteTime: whiteTimeOut ? '0' : `${whiteCountRef.current}`,
        blackTime: blackTimeOut ? '0' : `${blackCountRef.current}`,
        updatedAt: serverTimestamp()
      })
    }
  }, [result, board, whiteTimeOut, blackTimeOut, setBoardData])

  const loadData = useCallback(async() => {
    tnmntRef.current = await getDocById('tournaments', docId)
    if (user.role === 'G' && tnmntRef.current?.completed === '0') {
      const players = (tnmntRef.current?.joined || []).filter(id => id !== user?.id)?.length
      await updateDoc(doc(db, 'tournaments', docId), {joined: arrayUnion(user?.id)})
      if (players === 2 && tnmntRef.current?.delayed && !tnmntRef.current?.quickPair) {
        await updateDoc(doc(db, 'tournaments', docId), {quickPair: true})
        apiCall({type: 'TTQ', id: docId, start: tnmntRef.current?.start?.seconds, time: +tnmntRef.current?.time || 5, quick: true})
      } 
    } setReady(true)
  }, [docId, user])

  useEffect(() => {
    let boardLstn
    if (docId && tnmntRef.current && dataLoaded && refresh) {
      (async() => {
        if ([1, 2].includes(tnmntRef.current?.status)) {
          roundRef.current = +(tnmntRef.current?.completed || 0) + 1;
          if (roundRef.current <= +tnmntRef.current?.rounds) {
            const boards = (await getDocs(collection(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards'))).docs.map(b => ({...b.data(), id: b.id}))
            if (boards?.length) {
              if (user.role === 'G') {
                const pair = boards.find(({white, black}) => user?.id === white || user?.id === black)
                if (pair?.id) {
                  const {white, result, moves, whiteTime, blackTime, whiteJoined, blackJoined, whiteLeft, blackLeft, updatedAt, drawAsked} = pair
                  setResult(result)
                  const side = white === user?.id ? 'w' : 'b'
                  setOrientation(side)
                  
                  movesRef.current = moves
                  game.setMoves(moves)
                  const move = game.selectMove(moves.at(-1).i)
                  if (move) {
                    setFen(game.fen())
                    setLastMove(move)
                  }

                  boardLstn = onSnapshot(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${pair?.id}`), (snap) => {
                    if (snap.exists()) {
                      const {result, moves, whiteTime, blackTime, drawAsked} = snap.data()
                      
                      if (result) {
                        setWhitePause(true)
                        setBlackPause(true)
                        setWhiteClock(+whiteTime)
                        setBlackClock(+blackTime)
                        setResult(result)
                      }

                      if (movesRef.current.length !== moves.length) {
                        movesRef.current = moves
                        game.setMoves(moves)
                        const move = game.selectMove(moves.at(-1).i)
                        if (move) {
                          setFen(game.fen())
                          setLastMove(move)
                        }
                        if (!result) {
                          const play = game.turn()
                          setWhitePause(play === 'b')
                          setBlackPause(play === 'w')
                          setWhiteClock(+whiteTime)
                          setBlackClock(+blackTime)
                        }
                      }

                      if (drawAsked) {
                        if (drawAsked === user?.id) {
                          setDrawAsked(true)
                        } else {
                          setShowDraw(true)
                        }
                      } else {
                        setDrawAsked(false)
                        setShowDraw(false)
                      }                      
                    }                    
                  })

                  const turn = game.turn()
                  if (result || game.isGameOver()) {
                    setWhiteClock(+whiteTime)
                    setBlackClock(+blackTime)
                    if (!result) {
                      const mate = game.isCheckMate()
                      const matchResult = mate ? (turn === 'w' ? '0-1' : '1-0') : '1/2-1/2'
                      updateDoc(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${pair?.id}`), {
                        result: matchResult,
                        status: mate ? '4' : game.isStaleMate() ? '8' : game.isThreeFoldRepetition() ? '9' : game.isInsufficientMaterial() ? '10' : '11',
                        updatedAt: serverTimestamp()
                      })
                      setResult(matchResult)
                    }
                  } else {
                    if (!whiteJoined && side === 'w') updateDoc(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${pair?.id}`), {whiteJoined: true})
                    if (!blackJoined && side === 'b') updateDoc(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${pair?.id}`), {blackJoined: true})
                    if (whiteLeft && side === 'w') updateDoc(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${pair?.id}`), {whiteLeft: false})
                    if (blackLeft && side === 'b') updateDoc(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${pair?.id}`), {blackLeft: false})
                    const timeElapsed = dayjs(new Date().getTime() + timeoffset.current).unix() - updatedAt.seconds
                    const whiteCount = turn === 'w' ? (+whiteTime - timeElapsed) : +whiteTime
                    const blackCount = turn === 'b' ? (+blackTime - timeElapsed) : +blackTime
                    if (whiteCount > 0 && blackCount > 0) {
                      setWhiteCtrl(side === 'w')
                      setBlackCtrl(side === 'b')
                      setWhitePause(turn === 'b')
                      setBlackPause(turn === 'w')
                      setWhiteClock(whiteCount)
                      setBlackClock(blackCount)
                      if (drawAsked) {
                        if (drawAsked === user?.id) {
                          setDrawAsked(true)
                        } else {
                          setShowDraw(true)
                        }
                      }
                    } else if (whiteCount > 0) {
                      setWhiteClock(whiteCount)
                      updateDoc(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${pair?.id}`), {result: '1-0', status: '3', whiteTime: `${whiteCount}`, blackTime: '0', updatedAt: serverTimestamp()})
                      setResult('1-0')
                    } else if (blackCount > 0) {
                      setBlackClock(blackCount)
                      updateDoc(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${pair?.id}`), {result: '0-1', status: '3', whiteTime: '0', blackTime: `${blackCount}`, updatedAt: serverTimestamp()})
                      setResult('0-1')
                    } else {
                      const matchResult = turn === 'w' ? '0-1' : '1-0'
                      updateDoc(doc(db, 'tournaments', docId, 'rounds', `${roundRef.current}`, 'boards', `${pair?.id}`), {result: matchResult, status: '3', whiteTime: turn === 'w' ? '0' : `${whiteCount}`, blackTime: turn === 'b' ? '0' : `${blackCount}`, updatedAt: serverTimestamp()})
                      setResult(matchResult)
                    }
                  }
                  setBoard(pair)
                } else {
                  setMsg({type: 'info', text: 'You will be paired from next round.'})
                }
              }
            } else {
              if (tnmntRef.current?.mode === '2') {
                const delay = tnmntRef.current?.start?.seconds - (dayjs(new Date().getTime() + timeoffset.current).unix())
                if (delay > 0) {
                  setMsg({type: 'info', text: `Tournament will be started at ${dayjs(tnmntRef.current?.start?.seconds * 1000).format('DD-MMM-YYYY hh:mm A')}`})
                  setTimeout(() => onRefresh(), (delay + 1) * 1000)
                } else {
                  if (user.role === 'G') {
                    setMsg({type: 'info', text: `The round ${roundRef.current} will start soon!`})
                  }
                }
              } else {
                setMsg({type: 'info', text: `The Round ${roundRef.current} will be started at ${dayjs((tnmntRef.current?.begin || tnmntRef.current?.start?.seconds) * 1000).format('DD-MMM-YYYY hh:mm A')}`})
              }
            }
          } else {
            setMsg({type: 'info', text: 'Tournament completed!'})
            // onGoDetailPage()
          }
        } else {
          setMsg({type: 'info', text: tnmntRef.current?.status === 5 ? 'Tournament cancelled!' : 'Tournament completed!'})
          // tnmntRef.current?.status !== 5 && onGoDetailPage()
        } setProgress(false)
      })()
    }

    return () => {
      if (dataLoaded) {
        boardLstn && boardLstn()
      }
    }
  }, [dataLoaded, refresh, user, docId])

  useEffect(() => {
    let infoLstn, userLstn, tnmntLstn
    
    const infoQry = ref(rdb, '.info/connected'), userQry = ref(rdb, `/tnmnt/${docId}`)
    
    if (docId && user && ready && tnmntRef.current) {
      infoLstn = onValue(infoQry, (snap) => {
        set(child(userQry, `/${user?.id}`), {tab, online: snap.val() ? true : false})
        onDisconnect(child(userQry, `/${user?.id}`)).set({online: false})
      })

      userLstn = onValue(userQry, (snap) => {
        const data = snap.exists() ? Object.entries(snap?.val()).map(([k, v]) => v?.online ? k : null) : []
        if (!data.includes(user?.id)) set(child(userQry, `/${user?.id}`), {online: true})
        setOnlineUsers([...new Set(data.filter(e => e))])
        const mytab = snap.toJSON()[user?.id]
        if (mytab?.tab && mytab.tab !== tab) onClose()
      })

      tnmntLstn = onSnapshot(doc(db, 'tournaments', docId), (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          if (data?.refresh !== tnmntRef.current?.refresh) onRefresh()
          tnmntRef.current = data
        }
      })

      timeOffset().then(val => {
        timeoffset.current = val || 0
        setDataLoaded(true)
      })
    }

    return () => {
      if (docId && user && ready && tnmntRef.current) {
        infoLstn && infoLstn()
        userLstn && userLstn()
        tnmntLstn && tnmntLstn()
        userLstn && set(child(userQry, `/${user?.id}`), {online: false})
      }
    }
  }, [ready, user, docId])

  useEffect(() => {
    loadData()
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    
    return () => backHandler.remove()
  }, [])

  return (
    <Portal>
      <SafeAreaView style={{...s.fg1, ...s.bc3}}>
        {progress ? <Progress /> : <>
          <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.p8, ...s.bc2, paddingLeft: 4}}>
            <Ionicons name='trophy-outline' color='#87CEFA' size={26} />
            <Text variant='titleLarge' style={s.mra} numberOfLines={1}>{tnmntRef.current?.name} ({tnmntRef.current?.time} + {tnmntRef.current?.increment})</Text>
            <IconButton icon='refresh' size={34} onPress={onRefresh} iconColor='#87CEFA' />
          </View>
          <View style={{...s.fdr, ...s.aic, ...s.jcc, ...s.p8, ...s.bc2, height: 48}}>
            {result ? <Toast type='success' text={result === '1-0' ? 'White wins the game!' : result === '0-1' ? 'Black wins the game!' : result === '1/2-1/2' ? 'Game drawn!' : 'Completed'} /> : msg ? <Toast {...msg} /> : undefined}
          </View>
          {board ? <ScrollView overScrollMode='never'>
            <Text numberOfLines={1} style={{...s.mb8, ...s.asc}} variant='titleMedium'>
              {orientation === 'b' ? students.find(p => p.id === board.white)?.name || 'White' : students.find(p => p.id === board.black)?.name || 'Black'} (<Counter mode='down' start={orientation === 'b' ? whiteClock : blackClock} pause={orientation === 'b' ? whitePause : blackPause} onPause={orientation === 'b' ? onWhiteClockPause : onBlackClockPause} onEnd={orientation === 'b' ? onWhiteClockEnd : onBlackClockEnd} />)
            </Text>
            <View style={{pointerEvents: 'auto'}}>
              <Board
                draggable={((whiteCtrl && game.turn() === 'w') || (blackCtrl && game.turn() === 'b')) && !result}
                orientation={orientation}
                fen={fen}
                lastMove={lastMove}
                onDrop={onDrop}
              />
            </View>
            <Text numberOfLines={1} style={{...s.mt8, ...s.asc}} variant='titleMedium'>
              {orientation === 'w' ? students.find(p => p.id === board.white)?.name || 'White' : students.find(p => p.id === board.black)?.name || 'Black'} (<Counter mode='down' start={orientation === 'w' ? whiteClock : blackClock} pause={orientation === 'w' ? whitePause : blackPause} onPause={orientation === 'w' ? onWhiteClockPause : onBlackClockPause} onEnd={orientation === 'w' ? onWhiteClockEnd : onBlackClockEnd} />)
            </Text>
            {!result && <View style={s.mt8}>
              {showDraw ? <View style={{...s.fdr, ...s.aic, ...s.jcc}}>
                <IconButton icon='close-circle-outline' size={36} onPress={() => onAnswerDraw(false)} iconColor='#F08080' />
                <Toast type='info' text='Your opponent offers a draw' />
                <IconButton icon='check-circle-outline' size={36} onPress={() => onAnswerDraw(true)} iconColor='#90EE90' />
              </View> : drawAsked ? <View style={{...s.fdr, ...s.aic, ...s.jcc}}>
                <Toast type='info' text='Draw offer sent' />
              </View> : <View style={{...s.fdr, ...s.aic, ...s.jcc, ...s.g8}}>
                {tnmntRef.current?.resign && <Portal>
                  <Dialog visible={showResign} onDismiss={() => onResign(false)}>
                    <Dialog.Content style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                      <Icon source='checkbox-marked-circle-outline' color='#F50057' size={24} />
                      <Text variant='titleMedium'>Are you sure you want to resign?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                      <Button onPress={() => onResign(false)}>No</Button>
                      <Button onPress={() => onResign(true)}>Yes</Button>
                    </Dialog.Actions>
                  </Dialog>
                </Portal>}
                {tnmntRef.current?.draw && <Button onPress={() => setBoardData({drawAsked: user?.id})} buttonColor='#87CEFA' textColor='#000'>Ask Draw</Button>}
                {tnmntRef.current?.resign && <Button onPress={() => setShowResign(true)} buttonColor='#F08080' textColor='#000'>Resign</Button>}
              </View>}
            </View>}              
          </ScrollView> : <View style={s.f1}><Empty /></View>}
        </>}
      </SafeAreaView>
    </Portal>
  );
}
