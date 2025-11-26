// firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD-RX1tuQJXh6exr-w4QPGVawuZ2srj8hU",
  authDomain: "nameonly.firebaseapp.com",
  projectId: "nameonly",
  storageBucket: "nameonly.firebasestorage.app",
  messagingSenderId: "856004374876",
  appId: "1:856004374876:web:e62ea0ea28a68c15fd9199",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
