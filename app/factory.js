import { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ellipse, G, Path, Svg } from 'react-native-svg';
import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';
import s from './style';

const colors = {
  info: ['info', '#87CEFA', '#4169E1'],
  success: ['check-circle', '#90EE90', '#008B8B'],
  error: ['x-circle', '#F08080', '#C71585'],
  warning: ['alert-circle', '#DAA520', '#D2691E'],
  play: ['play-circle', '#87CEFA', '#4169E1'],
  pause: ['pause-circle', '#DAA520', '#D2691E']
};

export const Progress = ({color='#FF6D00', size='large'}) => <ActivityIndicator style={{...s.f1, ...s.bc2}} color={color} size={size} />;

export const Loader = ({color='#FF6D00', size='large'}) => <ActivityIndicator style={s.loader} color={color} size={size} />;

export const Empty = () => (
  <View style={{...s.f1, ...s.aic, ...s.jcc, ...s.g8}}>
    <Svg width='64' height='41' viewBox='0 0 64 41'>
      <G transform='translate(0 1)' fill='none' fillRule='evenodd'>
        <Ellipse fill='#333' cx='32' cy='33' rx='32' ry='7' />
        <G stroke='#AAA' fillRule='nonzero'>
          <Path d='M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z' fill='#333' />
          <Path d='M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z' fill='#444' />
        </G>
      </G>
    </Svg>
    <Text style={{...s.cbbb, ...s.fs18}}>No Data</Text>
  </View>
);

export const Button = ({title=null, type='primary', onPress=()=>{}}) => (
  <TouchableOpacity style={{...s.br5, ...s.p6, backgroundColor: colors[type]?.at(2) || '#4169E1'}} onPress={onPress}>
    <Text style={s.cfff}>{title}</Text>
  </TouchableOpacity>
);

export const Chip = ({type='info', text=null}) => (
  <View style={{...s.fdr, ...s.aic, ...s.p4, ...s.g4, ...s.br20, backgroundColor: colors[type]?.at(1) || '#87CEFA'}}>
    <Feather name={colors[type]?.at(0) || 'info'} size={20} />
    <Text style={{paddingBottom: 2, paddingRight: 3, textTransform: 'capitalize'}}>{text || type}</Text>
  </View>
);

export const Toast = ({type = 'info', text = null}) => (
  <View style={{...s.fdr, ...s.aic, ...s.p4, ...s.g4, ...s.br20, backgroundColor: colors[type]?.at(1) || '#87CEFA'}}>
    <Text style={{paddingBottom: 2, paddingLeft: 3, paddingRight: 3, textTransform: 'capitalize'}}>{text || type}</Text>
  </View>
);

export const Level = ({value = 1}) => (
  <View style={{...s.fdr, ...s.aic, ...s.p4, ...s.g4, ...s.br20, backgroundColor: colors[value === 3 ? 'error' : value === 2 ? 'info' : 'success']?.at(1) || '#87CEFA'}}>
    <Text style={{...s.px4, textTransform: 'capitalize'}}>{value === 3 ? 'Advanced' : value === 2 ? 'Intermediate' : 'Beginner'}</Text>
  </View>
);

export const Date = ({d=null, m=null, y=null, t=null}) => (
  <View style={{...s.jcc, ...s.br8, ...s.bc2, ...s.p8}}>
    <View style={{...s.fdr, ...s.aic, ...s.g8}}>
      <Text style={{...s.fs24, color: '#00FFFF'}}>{d}</Text>
      <View style={s.aic}>
        <Text style={s.cbbb}>{m}</Text>
        <Text style={s.cbbb}>{y}</Text>
      </View>
    </View>
    <Text style={{...s.cfff, ...s.p4}}>{t}</Text>
  </View>
);

export const Header = ({children, icon=null, title=null, filter=true, onBack=()=>{}, onFilter=()=>{}}) => (
  <View style={{...s.fdr, ...s.aic, ...s.g8, ...s.my8, ...s.px8}}>
    {/* <TouchableOpacity onPress={onBack} style={{paddingTop: 3}}>
      <AntDesign name='left' color='#FFF' size={24} />
    </TouchableOpacity>} */}
    {icon}
    <Text style={{...s.cfff, ...s.fs20}}>{title}</Text>
    {filter && <TouchableOpacity onPress={onFilter} style={s.mla}>
      <AntDesign name='filter' color='#F50057' size={26} />
    </TouchableOpacity>}
    {children}
  </View>
);

export const SearchList = memo(({label='Search', list=[], onChange=()=>{}}) => {
  const [search, setSearch] = useState('');
  const [arr, setArr] = useState(list.filter(e => e.status).map(e => ({selected: false, ...e})));

  const onSelect = (obj) => {
    obj.selected = !obj.selected;
    setArr(a => [...a]);
  };

  useEffect(() => {
    onChange(arr.filter(a => a.selected).map(a => a.id));
  }, [arr]);

  return (
    <View style={{...s.my8, ...s.br5, borderColor: '#CCC', borderWidth: 1}}>
      <TextInput
        placeholderTextColor='#666'
        placeholder={label}
        value={search}
        onChangeText={setSearch}
        style={{
          ...s.p6,
          ...s.px8,
          ...s.fs16,
          borderBottomWidth: 1,
          color: '#FFF',
          borderColor: '#CCC'
        }}
      />
      <ScrollView overScrollMode='never' showsVerticalScrollIndicator={false} nestedScrollEnabled={true} style={{height: 250}} contentContainerStyle={{...s.p8, ...s.g4}}>
        {arr.filter(a => a.name.toLowerCase().trim().search(search?.toLowerCase().trim()) !== -1 || a.selected).map(a => <View key={a.id} style={{...s.fdr, ...s.aic, ...s.g8}}>
          <MaterialIcons name={a.selected ? 'check-box' : 'check-box-outline-blank'} size={24} color={a.selected ? '#87CEFA' : '#BBB'} onPress={() => onSelect(a)} />
          <Text style={{...s.cbbb, ...s.fs16}}>{a.name}</Text>
        </View>)}
      </ScrollView>
    </View>
  );
});
