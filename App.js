// import 'expo-dev-client';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { RecoilRoot, useRecoilState, useSetRecoilState } from 'recoil';
import { getDocById, getDocsByField, getUser, getUsers } from './app/service';
import { Progress } from './app/factory';
import { AcademyState, GroupsState, UserState, UsersState } from './app/state';
import Login from './app/pages/login';
import Home from './app/pages/home';
import Session from './app/pages/session';
import s from './app/style';

const Stack = createNativeStackNavigator();

const Root = ({navigation}) => {
  const setAcademy = useSetRecoilState(AcademyState);
  const setUsers = useSetRecoilState(UsersState);
  const setGroups = useSetRecoilState(GroupsState);
  const [user, setUser] = useRecoilState(UserState);
  const [progress, setProgress] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);

  const setData = useCallback(async(data) => {
    if (data) {
      const groups = await getDocsByField('groups', ['C', 'D'].includes(data.role) ? [['academy', '==', data.academy], ['public', '==', true]] : [['createdBy', '==', data.id]]);
      groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      setAcademy(await getDocById('academies', data.academy));
      setUsers(await getUsers(data.academy));
      setGroups(groups);
    } else {
      setAcademy(null);
      setUsers([]);
      setGroups([]);
    } setProgress(false);
  }, []);

  const loadUser = useCallback(async() => {
    const data = await getUser();
    setUser(data?.id ? data : null);
    setPageLoaded(true);
  }, []);

  useEffect(() => {
    pageLoaded && setData(user);
  }, [pageLoaded, user]);

  useEffect(() => {
    loadUser();
  }, []);

  return progress ? <Progress /> : user ? <Home onNavigate={navigation.navigate} /> : <Login />;
};

const App = () => (
  <RecoilRoot>
    <PaperProvider theme={{...MD3DarkTheme, colors: {...MD3DarkTheme.colors, primary: '#DDD'}}}>
      <SafeAreaProvider>
        <SafeAreaView style={{...s.f1, ...s.bc2}}>
          <NavigationContainer>
            <Stack.Navigator initialRouteName='Root' screenOptions={{headerShown: false, statusBarColor: '#222222', navigationBarColor: '#222222'}}>
              <Stack.Screen name='Root' component={Root} />
              <Stack.Screen name='Session' component={Session} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  </RecoilRoot>
);

export default App;
