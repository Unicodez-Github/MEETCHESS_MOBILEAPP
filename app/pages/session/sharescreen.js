import { memo, useEffect, useRef, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { SessnState } from '../../state';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { registerGlobals, mediaDevices, MediaStream, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';
import notifee, { AndroidImportance } from '@notifee/react-native'

registerGlobals()

const getIceServers = async() => {
  let result = [{
    urls: "stun:stun.relay.metered.ca:80",
  }, {
    urls: "turn:standard.relay.metered.ca:80",
    username: "06bc8757dc883b3a9b5b43c9",
    credential: "EPpyF3QxZnvB74s1",
  }, {
    urls: "turn:standard.relay.metered.ca:80?transport=tcp",
    username: "06bc8757dc883b3a9b5b43c9",
    credential: "EPpyF3QxZnvB74s1",
  }, {
    urls: "turn:standard.relay.metered.ca:443",
    username: "06bc8757dc883b3a9b5b43c9",
    credential: "EPpyF3QxZnvB74s1",
  }, {
    urls: "turns:standard.relay.metered.ca:443?transport=tcp",
    username: "06bc8757dc883b3a9b5b43c9",
    credential: "EPpyF3QxZnvB74s1",
  }]
  try {
    const res = await fetch('https://classicchess.metered.live/api/v1/turn/credentials?apiKey=c3cdbbef6f677c85582b4e02f692a736c30a');
    result =  await res.json()
  } finally {
    return result
  }
}

export default memo(({onRefresh = () => {}}) => {
  const sessn = useRecoilValue(SessnState)
  const peerRef = useRef()
  const locStrm = useRef()
  const remStrm = useRef()
  const screen = useRef()
  const senders = useRef([])
  const [start, setStart] = useState(false)

  useEffect(() => {
    let ansLstn
    if (start) {
      (async() => {
        try {
          const channelId = await notifee.createChannel( {
            id: 'screen_capture',
            name: 'Screen Capture',
            lights: false,
            vibration: false,
            importance: AndroidImportance.DEFAULT
          })    
          await notifee.displayNotification( {
            title: 'Screen Capture',
            body: 'This notification will be here until you stop capturing.',
            android: {channelId, asForegroundService: true}
          })
      
          const iceServers = await getIceServers()
          peerRef.current = new RTCPeerConnection({iceServers})
          locStrm.current = await mediaDevices.getDisplayMedia()//await mediaDevices.getUserMedia({video: true})
          remStrm.current = new MediaStream()
          // locStrm.current?.getTracks().forEach(track => track?.stop())
          locStrm.current.getTracks().forEach(track => senders.current.push(peerRef.current.addTrack(track, locStrm.current)))
          peerRef.current.ontrack = event => event.streams[0].getTracks().forEach(track => remStrm.current.addTrack(track))
          
        

          peerRef.current.onicecandidate = event => event?.candidate && addDoc(collection(db, 'shares', sessn?.id, 'offers'), event.candidate.toJSON())
          const offerDes = await peerRef.current.createOffer()
          await peerRef.current.setLocalDescription(offerDes)

          await updateDoc(doc(db, 'shares', sessn?.id), {offer: {type: offerDes.type, sdp: offerDes.sdp}})

          ansLstn = onSnapshot(collection(db, 'shares', sessn?.id, 'answers'), (snap) => {
            snap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                peerRef.current.addIceCandidate(new RTCIceCandidate(change.doc.data()));
              }
            })
          })
        } catch (_) {}
      })()
    }

    return () => {
      if (start) {
        ansLstn && ansLstn()
      }
    }
  }, [start])

  useEffect(() => {
    let docLstn
    (async() => {
      try {
        await Promise.all((await getDocs(collection(db, 'shares', sessn?.id, 'offers'))).docs.map(d => deleteDoc(d.ref)))
        await Promise.all((await getDocs(collection(db, 'shares', sessn?.id, 'answers'))).docs.map(d => deleteDoc(d.ref)))
        await setDoc(doc(db, 'shares', sessn?.id), {offer: null, answer: null, refresh: false})
        
        docLstn = onSnapshot(doc(db, 'shares', sessn?.id), (snap) => {
          if (snap.exists()) {
            const {answer, refresh} = snap?.data()
            setStart(true)
            if (refresh) onRefresh()
            if (!peerRef.current?.currentRemoteDescription && answer?.sdp) {
              peerRef.current.setRemoteDescription(new RTCSessionDescription(answer))
              // shareScreen()
            }
          }
        })
      } catch (_) {}
    })()

    return () => {
      notifee.stopForegroundService()
      screen.current?.stop()
      docLstn && docLstn()
    }
  }, [])

  return undefined
})