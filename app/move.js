import { memo, Fragment, useMemo, useState, useEffect } from 'react';
import { AntDesign } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import s from './style';

const Variation = memo(({children, path=[], id=null, open=false}) => {
  const [opn, setOpen] = useState(open);
  useEffect(() => { if (id && path.includes(id)) setOpen(true); }, [path, id]);
  return (
    <View style={{...s.fdr, ...s.fww, ...s.g2, ...s.wf, marginLeft: 16}}>
      <Text style={{...s.cbbb, ...s.fs17}}>[</Text>
      {opn ? <>
        <AntDesign style={{...s.mt4, ...s.mr4}} name='minussquare' color='#90EE90' size={19} onPress={() => setOpen(false)} />
        {children}
      </> : <>
        <AntDesign style={{...s.mt4, ...s.mr4}} name='plussquare' color='#90EE90' size={19} onPress={() => setOpen(true)} />
        {children.at(0)}
        <Text style={s.cbbb}>...</Text>
      </>}
      <Text style={{...s.cbbb, ...s.fs17}}>]</Text>
    </View>
  );
});

const Moves = ({moves=[], index='_', open=false, onMove=()=>{}}) => {
  const path = useMemo(() => {
    return index.includes('-') ? index.split('-').reduce((p, c, i, a) => {
      if (i % 2 !== 0) {
        const l = p.at(-1);
        const v = `${a.at(i - 1)}-${c}`;
        p.push(l ? `${l}-${v}` : v);
      } return p;
    }, []) : [];
  }, [index]);
  
  const Move = (data) => data.filter(e => e && e.i && e.f && (e.s || e.c)).map(d => {
    return (
      <Fragment key={d.i}>
        {d.s && <Text style={{...s.cfff, ...s.br5, ...s.p2, ...s.fs16, paddingBottom: 3, backgroundColor: d.i === index ? '#F50057' : 'transparent'}} onPress={() => onMove(d.i)}>{d.n}{d.s}</Text>}
        {(d.v && d.v.length) && d.v.map((e, i) => <Variation key={`${d.i}-${i}`} id={`${d.i}-${i}`} path={path} open={open}>{Move(e)}</Variation>)}
      </Fragment>
    );
  });

  return (
    <View style={{...s.p8, ...s.fdr, ...s.fww, ...s.g2, ...s.wf}}>
      {Move(moves)}
    </View>
  );
};

export default memo(Moves);
