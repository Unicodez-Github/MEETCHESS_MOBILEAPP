import { Button, Dialog, Portal, Text } from 'react-native-paper'
import { Feather } from '@expo/vector-icons'
import { memo, useState } from 'react'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import dayjs from 'dayjs'
import s from '../../../app/style'

const Filter = ({open = false, from = dayjs(), to = dayjs(), onClose = () => {}}) => {
  const [fd, setFD] = useState(from)
  const [td, setTD] = useState(to)

  const onShowFD = (mode = 'date') => {
    DateTimePickerAndroid.open({mode, value: fd.toDate(), onChange: (_, date) => setFD(dayjs(date))});
  }

  const onShowTD = (mode = 'date') => {
    DateTimePickerAndroid.open({mode, value: td.toDate(), onChange: (_, date) => setTD(dayjs(date))});
  }

  const onSave = () => onClose({fd, td})

  return (
    <Portal>
      <Dialog visible={open} onDismiss={onSave}>
        <Dialog.Content style={{gap: 8}}>
          <Text style={{...s.cbbb, ...s.fs16}}>From Date</Text>
          <TouchableOpacity onPress={onShowFD} style={{...s.fg1, ...s.fdr, ...s.aic, borderWidth: 1, borderRadius: 6, borderColor: '#EEE', padding: 8}}>
            <Text style={{...s.cbbb, ...s.fs16}}>{fd.format('DD-MMM-YYYY')}</Text>
            <Feather color='#DDD' style={{marginLeft: 'auto'}} name='calendar' size={20} />
          </TouchableOpacity>
          <Text style={{...s.cbbb, ...s.fs16}}>To Date</Text>
          <TouchableOpacity onPress={onShowTD} style={{...s.fg1, ...s.fdr, ...s.aic, borderWidth: 1, borderRadius: 6, borderColor: '#EEE', padding: 8}}>
            <Text style={{...s.cbbb, ...s.fs16}}>{td.format('DD-MMM-YYYY')}</Text>
            <Feather color='#DDD' style={{marginLeft: 'auto'}} name='calendar' size={20} />
          </TouchableOpacity>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onSave} mode='contained-tonal' style={{padding: 0, ...s.px8}}>Search</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

export default memo(Filter)
