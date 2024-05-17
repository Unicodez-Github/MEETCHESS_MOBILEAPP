import { useRecoilState } from 'recoil'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons'
import { Button, Dialog, Icon, Portal, Text } from 'react-native-paper'
import { useState } from 'react'
import { logOut } from '../../service'
import { UserState } from '../../state'
import s from '../../style'

const Home = ({onNavigate=()=>{}}) => {
  const [user, setUser] = useRecoilState(UserState)
  const [signOut, setSignOut] = useState(false)

  const onSignOut = async() => {
    setSignOut(false)
    await logOut()
    setUser(null)
  }
  
  return (
    <View style={{...s.f1, ...s.bc2}}>
      <View style={{...s.aic, ...s.jcc, height: 56}}>
        <Text variant='titleLarge'>Welcome {user?.name}!</Text>
      </View>
      <ScrollView overScrollMode='never' contentContainerStyle={{...s.fg1, ...s.jcc}}>
        <View style={{...s.fdr, ...s.fww, ...s.jcc, ...s.g8}}>
          <TouchableOpacity style={{...s.aic, ...s.jcc, ...s.g8, ...s.bc3, ...s.br8, width: 120, height: 120}} onPress={() => onNavigate('Session')}>
            <FontAwesome5 name='headphones-alt' size={40} color='#F50057' />
            <Text variant='titleMedium'>Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{...s.aic, ...s.jcc, ...s.g8, ...s.bc3, ...s.br8, width: 120, height: 120}} onPress={() => onNavigate('Assignment')}>
            <MaterialIcons name='assignment' size={42} color='#F50057' />
            <Text variant='titleMedium'>Assignment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{...s.aic, ...s.jcc, ...s.g8, ...s.bc3, ...s.br8, width: 120, height: 120}} onPress={() => onNavigate('Tournament')}>
            <Ionicons name='trophy-outline' size={42} color='#F50057' />
            <Text variant='titleMedium'>Tournament</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{...s.aic, ...s.jcc, ...s.g8, ...s.bc3, ...s.br8, width: 120, height: 120}} onPress={() => setSignOut(true)}>
            <Icon source='location-exit' color='#F50057' size={42} />
            <Text variant='titleMedium'>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Portal>
        <Dialog visible={signOut} onDismiss={() => setSignOut(false)}>
          <Dialog.Content style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon source='location-exit' color='#F50057' size={24} />
            <Text variant='titleMedium'>Are you sure you want to logout?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSignOut(false)}>No</Button>
            <Button onPress={onSignOut}>Yes</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

export default Home;
