// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6vgbuxtvA0t__uBXpcxlHNmKGX6swF2I",
  authDomain: "lingualeap-3535f.firebaseapp.com",
  projectId: "lingualeap-3535f",
  storageBucket: "lingualeap-3535f.firebasestorage.app",
  messagingSenderId: "464130080922",
  appId: "1:464130080922:web:2a4d9afe1da32ee4b4df23"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
