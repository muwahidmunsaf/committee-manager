import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Replace with your own Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyDGWkKnkU4nSE7dPB3C2QoVJLilMHSlhZk',
  authDomain: 'asad-mobile-s.firebaseapp.com',
  projectId: 'asad-mobile-s',
  storageBucket: 'asad-mobile-s.firebasestorage.app',
  messagingSenderId: '528800541400',
  appId: '1:528800541400:web:2b14b62296b78e3a1c05ad',
  measurementId: 'G-28WR88X12Y'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Firestore database
export const db = getFirestore(app);
export const auth = getAuth(app);
export { app, analytics }; 