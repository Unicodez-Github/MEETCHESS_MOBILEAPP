import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { parseTime, serverTime } from '../../../service';
import Fen from '../../../fen';
import s from '../../../style';

const ViewQuestion = ({question=null, participants=[], answers=[], onClose=()=>{}}) => {
  const counter = useRef(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async() => {
      const timeElapsed = await serverTime() - question?.start?.seconds;
      const qstnTime = +question?.time - (timeElapsed > 0 ? timeElapsed : 0);
      if (qstnTime > 0) {
        setCount(qstnTime);
        counter.current = setInterval(() => setCount(e => --e), 1000);
      }
    })();

    return () => {
      if (counter.current) clearTimeout(counter.current);
    }
  }, []);

  useEffect(() => {
    if (counter.current && count < 1) {
      clearTimeout(counter.current);
    }
  }, [count]);

  return (
    <>
      <View style={{...s.f1, ...s.fdr, ...s.aic, ...s.mx8, ...s.g8, ...s.br5, ...s.bc3, ...s.p4}}>
        <Text style={{...s.cfff, ...s.fs16}} numberOfLines={1}>{question?.title}</Text>
        <Text style={{...s.cfff, ...s.fs18, ...s.mla}}>{parseTime(count)}</Text>
        <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.p4, ...s.px8, ...s.br5, backgroundColor: '#90EE90'}} onPress={onClose}>
          <Text>END</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{...s.mx8, ...s.mt4, ...s.mb8}} contentContainerStyle={s.g8} horizontal={true} nestedScrollEnabled={true} showsHorizontalScrollIndicator={false}>
        {participants.map(({ id, name, joined }) => {
          const attempts = [...answers].reverse().filter(a => a.user === id);
          const penalties = attempts.filter(({ s }) => s === 0).length * question?.penalty;
          const points = attempts.find(({ s }) => s === 1) ? question?.score - penalties : 0;
          return <View style={s.g8} key={id}>
            <View style={{...s.f1, ...s.fdr, ...s.aic, ...s.jcc, ...s.g8}}>
              <FontAwesome name='circle' color={joined ? '#90EE90' : 'red'} />
              <Text style={s.cfff} numberOfLines={1}>{name}</Text>
            </View>
            <View style={{width: 200, height: 200}}>
              <Fen orientation={question?.fen.split(' ')[1]} fen={attempts.find(({ s }) => s !== 0)?.f || question?.fen}/>
            </View>
            <View style={{...s.f1, ...s.fdr, ...s.aic, ...s.g4, ...s.bc3, ...s.p4, ...s.br5}}>
              <MaterialCommunityIcons name='star-circle' color='#90EE90' size={24} />
              <Text style={s.cfff}>{points > 0 ? points : 0} / {question?.score}</Text>
              <MaterialCommunityIcons name='close-circle' color='red' size={24} style={s.mla} />
              <Text style={s.cfff}>-{penalties}</Text>
            </View>
            <ScrollView style={{height: 200}} showsVerticalScrollIndicator={false} nestedScrollEnabled={true} contentContainerStyle={s.g4}>
              {attempts.filter(a => a.s !== 2).map((a, i) => <View key={i} style={{...s.fdr, ...s.aic, ...s.p4, ...s.br5, backgroundColor: a.s === 0 ? '#f8bbd0' : '#b9f6ca', justifyContent: 'space-between'}}>
                <Text>{a.m}</Text>
                <Text style={{color: 'blue'}}>{a.t}S</Text>
              </View>)}
            </ScrollView>
          </View>
        })}
      </ScrollView>
    </>
  );
};

export default ViewQuestion;
