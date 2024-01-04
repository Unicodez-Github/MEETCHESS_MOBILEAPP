import { Text, View } from 'react-native';
import s from '../../style';

const Leaderboard = ({points=[]}) => {
  return (
    <View style={s.m8}>
      <View style={{...s.f1, ...s.fdr, ...s.p4, ...s.bc3, alignSelf: 'stretch'}}>
        <Text style={{...s.f1, ...s.cbbb, ...s.p4, alignSelf: 'stretch'}}>Rank</Text>
        <Text style={{...s.f1, ...s.cbbb, ...s.p4, alignSelf: 'stretch'}}>Name</Text>
        <Text style={{...s.f1, ...s.cbbb, ...s.p4, alignSelf: 'stretch'}}>Points</Text>
        <Text style={{...s.f1, ...s.cbbb, ...s.p4, alignSelf: 'stretch'}}>Attempts</Text>
      </View>
      {points.filter(p => p && !p.hide).map((e, i) => <View key={e.user} style={{...s.f1, ...s.fdr, ...s.p4, alignSelf: 'stretch', borderBottomWidth: 1, borderBottomColor: '#333'}}>
        <Text style={{...s.f1, ...s.cbbb, ...s.p4, alignSelf: 'stretch'}}>{i + 1}</Text>
        <Text style={{...s.f1, ...s.cbbb, ...s.p4, alignSelf: 'stretch'}}>{e.name}</Text>
        <Text style={{...s.f1, ...s.cbbb, ...s.p4, alignSelf: 'stretch'}}>{e.point}</Text>
        <Text style={{...s.f1, ...s.cbbb, ...s.p4, alignSelf: 'stretch'}}>{e.attempt}</Text>
      </View>)}
    </View>
  );
};

export default Leaderboard;
