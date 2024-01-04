import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, updateDoc, where, writeBatch } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { auth, db, rdb } from './firebase';
import { pageSize } from './constant';
import dayjs from 'dayjs';

export const create = (data, user) => ({
  ...data,
  createdBy: user,
  updatedBy: user,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

// export const uniqueArr = (arr, keys) => {
//   const uniqueIds = new Set();
//   return (keys && Array.isArray(keys) && keys.length) ? arr.filter(e => {
//     const uid = keys.reduce((a, c) => `${a}${e[c]}`, '');
//     const found = uniqueIds.has(uid);
//     uniqueIds.add(uid);
//     return !found;
//   }) : arr;
// };

// export const setItem = async(key, val) => await storage.setItem(key, JSON.stringify(val));

// export const getItem = async(key) => JSON.parse(await storage.getItem(key));

export const getGroupedStudents = (data) => data.reduce((a, c) => a.concat(c?.members || []), []);

export const parseDate = (data) => {
  const [d, m, y, t] = dayjs(data.seconds * 1000).format('DD|MMM|YYYY|hh:mm A').split('|');
  return {d, m, y, t};
};

export const parseTime = (data) => {
  // const d = Math.floor(data / (60 * 60 * 24));
  const h = Math.floor((data / (60 * 60)) % 24);
  const m = `${Math.floor((data / 60) % 60)}`.padStart(2, '0');
  const s = `${Math.floor(data % 60)}`.padStart(2, '0');
  return h ? [`${h}`.padStart(2, '0'), m, s].join(':') : [m, s].join(':');
};

export const sortUser = (data) => {
  data.forEach(e => e.name = e.name.trim());
  data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  data.every(e => e && e.role) && data.sort((a, b) => a.role.localeCompare(b.role));
  data.sort((a, b) => b.status - a.status);
  return data;
};

export const serverTime = () => new Promise(res => onValue(ref(rdb, '.info/serverTimeOffset'), (snap) => {
  res(dayjs(new Date().getTime() + snap.val()).unix());
}, { onlyOnce: true }));

export const logOut = async() => {
  let result = false;
  try {
    await signOut(auth);
    result = true;
  } finally {
    return result;
  }
};

export const getUser = () => new Promise(res => onAuthStateChanged(auth, async(data) => {
  if (data?.uid) {
    const user = {...(await getDoc(doc(db, 'users', data.uid))).data(), id: data?.uid};
    if (user?.id && user?.academy && user?.status === 1 && ['C', 'D', 'E', 'F', 'G'].includes(user?.role)) {
      res(user);
    } else {
      await logOut();
      res({code: user?.id ? 'auth/user-deactivated' : 'auth/user-not-found'});
    }
  } else {
    await logOut();
    res({code: 'auth/user-not-found'});
  }
}));

export const logIn = async(email, password) => {
  let result = null;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    result = await getUser();
  } catch(err) {
    result = err;
  } finally {
    return result;
  }
};

export const getDocById = async(col, id) => {
  let result = null;
  try {
    const res = (await getDoc(doc(db, col, id))).data();
    result = {...res, id};
  } finally {
    return result;
  }
};

export const createDoc = async(col, data, user) => {
  let result = null;
  try {
    const res = await addDoc(collection(db, col), create(data, user));
    result = res.id;
  } finally {
    return result;
  }
};

export const changeDoc = async(col, id, data) => {
  let result = null;
  try {
    await updateDoc(doc(db, col, id), data);
    result = id;
  } finally {
    return result;
  }
};

export const getUsers = async(academy) => {
  let result = [];
  try {
    const res = await getDocs(query(collection(db, 'users'), where('academy', '==', academy)));
    result = sortUser((res.docs || []).map(e => ({...e.data(), id: e.id})));
  } finally {
    return result;
  }
};

export const getDocsByField = async(col, field, order) => {
  let result = [];
  try {
    const queryArr = [...(field || []).map(e => where(...e)), ...(order || []).map(e => orderBy(...e))];
    const res = await getDocs(query(collection(db, col), ...queryArr));
    result = res.docs.map(e => ({...e.data(), id: e.id}));
  } finally {
    return result;
  }
};

export const getData = async(col, field, order, last) => {
  let result = [];
  try {
    const queryArr = [...(field || []).map(e => where(...e)), ...(order || []).map(e => orderBy(...e))];
    if (last && last.length) queryArr.push(startAfter(...last));
    queryArr.push(limit(pageSize));
    const res = await getDocs(query(collection(db, col), ...queryArr));
    result = res.docs.map(e => ({...e.data(), id: e.id}));
  } finally {
    return result;
  }
};

export const saveAnswer = async(data) => {
  let result = false; let batch = writeBatch(db);
  data.forEach((a) => {
    const ansRef = doc(collection(db, 'answers'));
    batch.set(ansRef, create(a, a.user));
  });
  try {
    await batch.commit();
    result = true;
  } finally {
    return result;
  }
};
