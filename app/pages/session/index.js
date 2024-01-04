import { useRecoilValue } from 'recoil';
import { SessnState } from '../../state';
import Session from './session';
import Room from './room';

export default ({navigation}) => {
  const sessn = useRecoilValue(SessnState);
  return sessn ? <Room /> : <Session onNavigate={navigation.navigate} />
};
