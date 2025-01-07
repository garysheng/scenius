import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBZ7ArG5Ydunbz6qQCHEOfUkC852NFgBCM",
  authDomain: "scenius-e2adc.firebaseapp.com",
  projectId: "scenius-e2adc",
  storageBucket: "scenius-e2adc.firebasestorage.app",
  messagingSenderId: "282937790664",
  appId: "1:282937790664:web:7f46f70331d52a266f95fd",
  measurementId: "G-CJVBWL5FQ6"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage }; 