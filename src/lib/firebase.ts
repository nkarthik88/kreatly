import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyA1ZQYCXHk2NQ9SbF1KfCBw6XvQJCBacb0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "kreatly-1365e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "kreatly-1365e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "kreatly-1365e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "1083279778087",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:1083279778087:web:9c202d5d0762240ef3c902",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-R2Q4YFGC8P",
};

// eslint-disable-next-line no-console
console.log("[firebase] projectId:", firebaseConfig.projectId, "| apiKey present:", Boolean(firebaseConfig.apiKey));

// getApps() guard makes this safe to call on every hot-reload re-import.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
// getFirestore always returns the existing instance — never throws on re-import.
const db = getFirestore(app);

// eslint-disable-next-line no-console
console.log("[firebase] Firestore instance ready. App name:", app.name);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app, auth, db, googleProvider };

