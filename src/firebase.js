import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDVNTz7lch5MqTEEHXqwiLXr5AShNPeu40",
  authDomain: "aura-music-56378.firebaseapp.com",
  projectId: "aura-music-56378",
  storageBucket: "aura-music-56378.firebasestorage.app",
  messagingSenderId: "487346156024",
  appId: "1:487346156024:web:bace86fbe92f8961e9660d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
