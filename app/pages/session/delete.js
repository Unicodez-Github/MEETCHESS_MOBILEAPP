import { Button, Dialog, Icon, Portal, Text } from 'react-native-paper'
import { memo } from 'react'

const Delete = ({data = null, onClose = () => {}}) => {
  return (
    <Portal>
      <Dialog visible={data !== null} onDismiss={() => onClose(null)}>
        <Dialog.Content style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <Icon source='delete-outline' color='#F50057' size={24} />
          <Text variant='titleMedium'>Are you sure you want to delete?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => onClose(null)}>No</Button>
          <Button onPress={() => onClose(data)}>Yes</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

export default memo(Delete)
