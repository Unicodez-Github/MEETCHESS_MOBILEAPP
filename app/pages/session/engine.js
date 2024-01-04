import { memo, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Chess } from 'chess.js';
import { startFen } from '../../constant';
import s from '../../style';

const chess = new Chess();

const parse = ({v = '', m = ''}) => {
  const [text, moves] = m.split(` multipv ${v} score `).at(1).split(' pv ');
  const [type, value] = text.split(' ');
  return {v, u: type, s: value, m: moves};
};

const Engine = ({fen = startFen}) => {
  const engine = useRef();
  const [ready, setReady] = useState(false);
  const [v1, setV1] = useState();
  const [v2, setV2] = useState();
  const [v3, setV3] = useState();

  const onMessage = ({nativeEvent: {data}}) => {
    const factor = fen.split(' ').at(1) === 'w' ? 1 : -1;
    const chess = new Chess(fen);
    const {v, u, s, m} = parse(JSON.parse(data));
    const score = (u === 'cp' ? s / 100 : s) * factor;
    const moves = m.split(' ').map(e => chess.move(e, { sloppy: true })?.san);
    v === 1 ? setV1({s: score, m: moves}) : v === 2 ? setV2({s: score, m: moves}) : setV3({s: score, m: moves});
  };

  useEffect(() => {
    ready && fen && chess.validate_fen(fen)?.valid && engine.current?.postMessage(fen);
  }, [fen, ready]);

  return (
    <View style={{...s.mx8, ...s.g8}}>
      {[v1, v2, v3].filter(e => e).map((e, i) => <View key={i} style={{...s.bcc, ...s.p8, ...s.br5, ...s.fdr, ...s.aic}}>
        <View style={{backgroundColor: '#FFF', marginRight: 8, padding: 8, ...s.br5}}><Text>{e.s}</Text></View>
        <View style={{...s.f1, ...s.fdr, ...s.fww}}>
          {e.m.map((m, j) => <Text key={j}>{m} </Text>)}
        </View>
      </View>)}
      <WebView ref={engine} onLoad={() => setReady(true)} onMessage={onMessage} source={{uri: `https://mchess-engine.netlify.app/`}} style={{height: 0}} />
    </View>
  );
};

export default memo(Engine);
