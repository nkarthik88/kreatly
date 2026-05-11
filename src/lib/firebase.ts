import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Hardcoded config per user instruction
const firebaseConfig = {
  apiKey: "AIzaSyA1ZQYCXHk2NQ9SbF1KfCBw6XvQJCBacb0",
  authDomain: "kreatly-1365e.firebaseapp.com",
  projectId: "kreatly-1365e",
  storageBucket: "kreatly-1365e.firebasestorage.app",
  messagingSenderId: "1083279778087",
  appId: "1:1083279778087:web:9c202d5d0762240ef3c902",
  measurementId: "G-R2Q4YFGC8P",
};

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
// eslint-disable-next-line no-console
console.log("Firebase Initialized");

// Google provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export { app, auth, db, googleProvider };

