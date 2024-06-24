import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, doc, documentId, getDoc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, updateDoc, where, writeBatch } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { auth, db, rdb } from './firebase';
import { pageSize } from './constant';
import dayjs from 'dayjs';

import { Audio } from 'expo-av'
const capSound = require('../assets/sounds/cap.mp3')
const movSound = require('../assets/sounds/mov.mp3')
export async function playSound(cap) {
  const audio  = await Audio.Sound.createAsync(cap ? capSound : movSound)
  await audio.sound.playAsync()
}

export const create = (data, user) => ({
  ...data,
  createdBy: user,
  createdAt: serverTimestamp()
});

export const update = (data, user) => ({
  ...data,
  updatedBy: user,
  updatedAt: serverTimestamp()
});

export const chunk = (data = [], length = 30) => {
  const result = []; let arr = [...data];
  while (arr.length) { result.push(arr.splice(0, length)); }
  return result;
}

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

export const timeOffset = () => new Promise(res => onValue(ref(rdb, '.info/serverTimeOffset'), (snap) => {
  res(snap.val());
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

export const changeDoc = async(col, id, data, user) => {
  let result = null;
  try {
    await updateDoc(doc(db, col, id), update(data, user));
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

export const getDataByField = async(col = '', userId = '', field = '', data = []) => {
  let result = [];
  try {
    const res = await Promise.all(chunk(data).map(e => getDocs(query(collection(db, col), where('user', '==', userId), where(field, 'in', e)))));
    result = res.reduce((p, c) => p.concat(c.docs), []).map(e => ({...e.data(), id: e.id}));
  } finally {
    return result;
  }
}

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

export const getReport = async(report, user) => {
  let result = null;
  try {
    const res = await getDocs(query(collection(db, 'reports'), where('user', '==', user), where('report', '==', report), limit(1)))
    result = (res.docs || []).map(e => ({...e.data(), id: e.id})).at(0);
  } finally {
    return result;
  }
};

export const uniqBy = (data, key) => {
  return ((arr, key) => [...new Map(arr.map(x => [key(x), x])).values()])(data, e => e[key]);
}

export const findById = async(col, data) => {
  let result = [];
  try {
    const res = await Promise.all(chunk(data).map(async(e) => await getDocs(query(collection(db, col), where(documentId(), 'in', e)))));
    const temp = res.reduce((p, c) => p.concat(c.docs), []);
    result = temp.map(e => ({ id: e.id, ...e.data()}));
  } finally {
    return result;
  }
}

export const getActivities = async(assignment, user) => {
  let result = [];
  try {
    const games = await findById('games', assignment.activities);
    const ans = await getDocs(query(collection(db, 'answers'), where('assignment', '==', assignment.id), where('user', '==', user)));
    const answers = uniqBy((ans.docs || []).map(e => ({ ...e.data(), id: e.id })), 'activity');
    result = assignment.activities.map(act => {
      const answer = answers.find(a => a.activity === act);
      const game = games.find(g => g.id === act);
      const obj = {
        activity: act,
        fen: game?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        answerId: answer ? answer.id : null,
        score: answer ? (answer.score || 0) : 0,
        solved: answer ? (answer.solved || false) : false,
        attemptCount: answer ? (answer.answers || []).length : 0,
        timeTaken: answer ? (answer.timeTaken || 0) : 0,
        answers: answer ? (answer.answers || []) : [],
        moves: typeof game?.moves === 'string' ? JSON.parse(game?.moves) : (game?.moves || [])
      };
      obj.timeUp = (assignment && assignment.maxTime && +assignment.maxTime > 0 && obj.timeTaken >= +assignment.maxTime) ? true : false;
      obj.attemptUp = (assignment && assignment.maxAttempt && +assignment.maxAttempt > 0 && obj.attemptCount >= +assignment.maxAttempt) ? true : false;
      return obj;
    });
  } finally {
    return result;
  }
};

export const saveReport = async(report, reportId) => {
  let result = null;
  try {
    const res = reportId ? await updateDoc(doc(db, 'reports', reportId), {
      ...report, updatedAt: serverTimestamp()
    }) : await addDoc(collection(db, 'reports'), {
      ...report, createdAt: serverTimestamp()
    });
    result = { id: reportId || res.id };
  } finally {
    return result;
  }
};

export const saveAssAnswer = async(answer, answerId) => {
  let result = null;
  try {
    const res = answerId ? await changeDoc('answers', answerId, answer, answer.user) : await createDoc('answers', answer, answer.user);
    result = { id: answerId || res.id };
  } finally {
    return result;
  }
}
