import { View } from 'react-native'
import { ActivityIndicator, Modal, Portal, Text } from 'react-native-paper'
import { useRecoilValue } from 'recoil'
import { Feather } from '@expo/vector-icons'
import { SessnState, UserState, UsersState } from '../../state'
import { useCallback, useState } from 'react'
import { SearchList } from '../../factory'
import { Button } from '../../components'
import { changeDoc } from '../../service'
import { arrayUnion } from 'firebase/firestore'
import s from '.././../style'

const AddParticipant = ({onClose = () => {}}) => {
  const user = useRecoilValue(UserState)
  const users = useRecoilValue(UsersState)
  const sessn = useRecoilValue(SessnState)
  const [progress, setProgress] = useState(false)
  const [students, setStudents] = useState([])

  const onAdd = async() => {
    setProgress(true)
    await changeDoc('sessions', sessn?.id, {participants: arrayUnion(...students)}, user?.id)
    onClose()
    setProgress(false)
  }

  return (
    <Portal>
      <Portal>
        <Modal dismissable={false} visible={true} contentContainerStyle={{...s.p8, margin: 10, borderRadius: 4, backgroundColor: '#444'}}>
          <View style={{...s.fdr, ...s.aic, ...s.g8}}>
            <Text variant='titleLarge' style={s.mra}>Add Participant</Text>
            <Button text='Close' icon={<Feather name='x' size={18} />} backgroundColor='#CCC' onPress={() => onClose()} />
            <Button text='Add' icon={<Feather name='plus' size={18} />} onPress={onAdd} />
          </View>
          <SearchList label='Search Student' list={users.filter(e => e?.role === 'G')} onChange={useCallback(setStudents, [])} />
          {progress && <View style={{...s.layer, backgroundColor: '#000000AA', ...s.jcc}}><ActivityIndicator size={30} /></View>}
        </Modal>
      </Portal>
    </Portal>
  )
}

export default AddParticipant
