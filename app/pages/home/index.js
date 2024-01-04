import { useRecoilValue } from 'recoil';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { UserState } from '../../state';
import s from '../../style';

const Home = ({onNavigate=()=>{}}) => {
  const user = useRecoilValue(UserState);
  
  return (
    <View style={{...s.f1, ...s.bc2}}>
      <View style={{...s.aic, ...s.jcc, height: 56}}>
        <Text style={{...s.cfff, ...s.fs22}}>Welcome {user?.name}!</Text>
      </View>
      <ScrollView contentContainerStyle={{...s.fg1, ...s.jcc}}>
        <View style={{...s.fdr, ...s.fww, ...s.jcc, ...s.g8}}>
          <TouchableOpacity style={{...s.aic, ...s.jcc, ...s.g8, ...s.bc3, ...s.br8, width: 120, height: 120}} onPress={() => onNavigate('Session')}>
            <FontAwesome5 name='headphones-alt' size={40} color='#F50057' />
            <Text style={s.cfff}>Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default Home;
