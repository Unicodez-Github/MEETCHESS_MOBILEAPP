import { atom } from 'recoil';

export const UserState = atom({
  key: 'user',
  default: null
});

export const AcademyState = atom({
  key: 'academy',
  default: null
});

export const UsersState = atom({
  key: 'users',
  default: []
});

export const GroupsState = atom({
  key: 'groups',
  default: []
});

export const TnmntState = atom({
  key: 'tnmnt',
  default: null
});

export const SessnState = atom({
  key: 'sessn',
  default: null
});
