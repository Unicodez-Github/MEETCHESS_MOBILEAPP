import { View } from 'react-native'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import { useRecoilState } from 'recoil'
import { Feather } from '@expo/vector-icons';
import { SetngState } from '../../state'
import { useState } from 'react';

const colors = ['red', 'green', 'blue', 'darkorange']

const Settings = ({onClose = () => {}}) => {
  const [settings, setSettings] = useRecoilState(SetngState)
  const [hcolors, setHcolors] = useState(colors.map(c => ({id: c, selected: settings.at(0) === c})))
  const [acolors, setAcolors] = useState(colors.map(c => ({id: c, selected: settings.at(1) === c})))

  const onHCChange = (id) => {
    setHcolors(data => data.map(h => ({...h, selected: h.id === id})))
  }
  const onACChange = (id) => {
    setAcolors(data => data.map(a => ({...a, selected: a.id === id})))
  }
  const onSave = () => {
    setSettings([hcolors.find(h => h.selected).id, acolors.find(a => a.selected).id])
    onClose()
  }
  return (
    <Portal>
      <Dialog visible={true} onDismiss={onSave}>
        <Dialog.Title>Board Settings</Dialog.Title>
        <Dialog.Content>
          <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
            <Text variant='titleMedium' style={{flexGrow: 1}}>Highlight Color</Text>
            <View style={{flexDirection: 'row', gap: 16, alignItems: 'center'}}>
              {hcolors.map((h, i) => <View key={i} style={{height: h.selected ? 30 : 20, width: h.selected ? 30 : 20, borderRadius: h.selected ? 15 : 10, borderWidth: h.selected ? 4 : 0, borderColor: '#FFF', backgroundColor: h.id}} onStartShouldSetResponder={() => onHCChange(h.id)} />)}
            </View>
          </View>
          <View style={{flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 16}}>
            <Text variant='titleMedium' style={{flexGrow: 1}}>Arrow Color</Text>
            <View style={{flexDirection: 'row', gap: 16, alignItems: 'center'}}>
              {acolors.map((a, i) => <View key={i} style={{height: a.selected ? 30 : 20, width: a.selected ? 30 : 20, borderRadius: a.selected ? 15 : 10, borderWidth: a.selected ? 4 : 0, borderColor: '#FFF', backgroundColor: a.id}} onStartShouldSetResponder={() => onACChange(a.id)} />)}
            </View>
          </View>
        </Dialog.Content>
      </Dialog>
    </Portal>
  )
}

export default Settings
