import { useCallback, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { Text, TouchableOpacity, ScrollView, Switch, TextInput, KeyboardAvoidingView, View } from 'react-native';
import { Feather } from '@expo/vector-icons'; 
import { Header, Loader, SearchList } from '../../factory';
import { createDoc, getGroupedStudents } from '../../service';
import { AcademyState, GroupsState, UserState, UsersState } from '../../state';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import s from '../../style';

const Create = ({doc = null, onClose=()=>{}}) => {
  const user = useRecoilValue(UserState);
  const academy = useRecoilValue(AcademyState);
  const grps = useRecoilValue(GroupsState);
  const usrs = useRecoilValue(UsersState);
  const [progress, setProgress] = useState(false);
  const [name, setName] = useState(doc?.name || '');
  const [nameErr, setNameErr] = useState(false);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [notifyEmail, setNotifyEmail] = useState(doc?.notifyEmail || false);
  const [scheduled, setScheduled] = useState(doc?.scheduled || (doc?.event ? true : false));
  const [date, setDate] = useState(doc ? dayjs(doc.date.seconds * 1000) : dayjs());

  const onShowDate = (mode = 'date') => {
    DateTimePickerAndroid.open({mode, value: date.toDate(), onChange: (_, date) => setDate(dayjs(date))});
  };

  const onNameChange = (data) => {
    setName(data);
    setNameErr(data ? false : true);
  };

  const onSave = async() => {
    if (!name) return setNameErr(true);
    const participants = [...new Set([...getGroupedStudents(grps.filter(g => groups.includes(g.id))), ...students])].filter(e => e);
    if (!participants.length) return onClose();
    setProgress(true);
    onClose(await createDoc('sessions', {
      name, participants, video: 1, notifyEmail: false, academy: academy?.id,
      date: dayjs().second(0).toDate(), status: 1
    }, user?.id));
  };

  return (
    <KeyboardAvoidingView style={{...s.f1, ...s.bc2}} behavior='padding' keyboardVerticalOffset={50}>
      <Header filter={false} title='Create' onBack={() => onClose()}>
        <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g4, ...s.mla, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={onSave}>
          <Feather name='save' size={20} />
          <Text>SAVE</Text>
        </TouchableOpacity>
      </Header>
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true} style={s.m8}>
        <TextInput
          placeholderTextColor='#666'
          placeholder='Session Name'
          value={name}
          onChangeText={onNameChange}
          style={{
            ...s.p6,
            ...s.px8,
            ...s.br5,
            ...s.fs16,
            borderWidth: 1,
            color: '#FFF',
            borderColor: '#CCC'
          }}
        />
        {nameErr && <Text style={{...s.p4, color: '#FF6D00'}}>Session name is required</Text>}
        <View style={{...s.f1, ...s.fdr, ...s.aic, ...s.g4}}>
          <Switch thumbColor={notifyEmail ? '#87CEFA' : '#CCC'} trackColor={{true: '#87CEFA55', false: '#555'}} value={notifyEmail} onValueChange={setNotifyEmail} />
          <Text style={{...s.cbbb, ...s.fs16}}>Notify by Email</Text>
          <Switch thumbColor={scheduled ? '#87CEFA' : '#CCC'} trackColor={{true: '#87CEFA55', false: '#555'}} value={scheduled} onValueChange={setScheduled} />
          <Text style={{...s.cbbb, ...s.fs16}}>Schedule</Text>
        </View>
        {scheduled && <View style={{...s.f1, ...s.fdr, ...s.aic, ...s.g8, ...s.mb8}}>
          <TouchableOpacity onPress={onShowDate} style={{...s.f1, ...s.fdr, ...s.aic, borderRadius: 6, borderWidth: 1, borderColor: '#EEE', padding: 8}}>
            <Text style={{...s.cbbb, ...s.fs16}}>{date.format('DD-MMM-YYYY')}</Text>
            <Feather color='#DDD' style={{marginLeft: 'auto'}} name='calendar' size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onShowDate('time')} style={{...s.f1, ...s.fdr, ...s.aic, borderRadius: 6, borderWidth: 1, borderColor: '#EEE', padding: 8}}>
            <Text style={{...s.cbbb, ...s.fs16}}>{date.format('hh:mm A')}</Text>
            <Feather color='#DDD' style={{marginLeft: 'auto'}} name='clock' size={20} />
          </TouchableOpacity>
        </View>}
        <SearchList label='Search Group' list={grps} onChange={useCallback(setGroups, [])} />
        <SearchList label='Search Student' list={usrs.filter(e => e?.role === 'G')} onChange={useCallback(setStudents, [])} />
      </ScrollView>
      {progress && <Loader />}
    </KeyboardAvoidingView>
  );
};

export default Create;
