import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const app = initializeApp({
  databaseURL: 'https://meet-chess-app-default-rtdb.asia-southeast1.firebasedatabase.app',
  apiKey: 'AIzaSyDx2XkUhApO-Fog_KjwjoMCGcWdW3ZhmEc',
  authDomain: 'meet-chess-app.firebaseapp.com',
  projectId: 'meet-chess-app',
  storageBucket: 'meet-chess-app.appspot.com',
  messagingSenderId: '190156452625',
  appId: '1:190156452625:web:946c9a4916306e0eabd2b0'
});

initializeAuth(app, { persistence: getReactNativePersistence(ReactNativeAsyncStorage) });

export const auth = getAuth(app);
export const rdb = getDatabase(app);
export const db = getFirestore(app);
export const fns = getFunctions(app, 'asia-south1');
export const apiCall = httpsCallable(fns, 'apiCall');
