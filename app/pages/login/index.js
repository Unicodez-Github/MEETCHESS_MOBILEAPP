import { useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { ImageBackground, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons'; 
import { Progress } from '../../factory';
import { logIn } from '../../service';
import { chess } from '../../image';
import { UserState } from '../../state';
import s from '../../style';

const Login = () => {
  const setUser = useSetRecoilState(UserState);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [progress, setProgress] = useState(false);

  const onUsernameChange = (value = '') => {
    setUsername(value);
    setUsernameError(value ? '' : 'Username is required');
  };

  const onPasswordChange = (value = '') => {
    setPassword(value);
    setPasswordError(value ? '' : 'Password is required');
  };

  const onPress = async() => {
    const email = username.includes('@') ? username : `${username.trim().toLowerCase()}@meet.chess`;
    const pass = password.trim();
    if (email && pass) {
      setProgress(true);
      const result = await logIn(email, pass);
      if (result?.id) {
        setUser(result);
      } else {
        setUsernameError((result?.code === 'auth/user-not-found' || result?.code === 'auth/invalid-email') ? 'Wrong username' : result?.code === 'auth/user-deactivated' ? 'User deactivated' : '');
        setPasswordError(result?.code === 'auth/wrong-password' ? 'Wrong password' : '');
      }
      setProgress(false);
    } else {
      setUsernameError('Username is required');
      setPasswordError('Password is required');
    }
  };

  return (
    <ImageBackground source={chess} style={s.f1} resizeMode='repeat'>
      <ScrollView overScrollMode='never' contentContainerStyle={{...s.fg1, ...s.jcc}} style={s.bc2e}>
        {progress ? <Progress /> : <View style={{...s.m16, ...s.p16, ...s.br8, ...s.bc4d}}>
          <View style={{...s.bce, ...s.asc, ...s.aic, ...s.jcc, width: 52, height: 52, borderRadius: 26}}>
            <Feather name='lock' size={30} color='#FFF' />
          </View>
          <Text style={{...s.m16, ...s.asc, ...s.cfff, ...s.fs20 }}>Sign In</Text>
          <TextInput style={s.input} placeholderTextColor='#CCC'
            placeholder='Username' value={username} onChangeText={onUsernameChange}
          />
          <Text style={{color: '#FF6D00'}}>{usernameError}</Text>
          <TextInput style={s.input} placeholderTextColor='#CCC' secureTextEntry
            placeholder='Password' value={password} onChangeText={onPasswordChange}            
          />
          <Text style={{color: '#FF6D00'}}>{passwordError}</Text>
          <TouchableOpacity style={{...s.aic, ...s.jcc, ...s.button}} onPress={onPress}>
            <Text style={{...s.cfff, ...s.fs16}}>SIGN IN</Text>
          </TouchableOpacity>
        </View>}
      </ScrollView>
    </ImageBackground>
  );
};

export default Login;
