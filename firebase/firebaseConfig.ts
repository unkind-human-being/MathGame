// firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth,GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDC8Ru257nX-GpZNFjDczOdOCwylRc3mSM",
  authDomain: "azmath-31da4.firebaseapp.com",
  projectId: "azmath-31da4",
  storageBucket: "azmath-31da4.firebasestorage.app",
  messagingSenderId: "772639561354",
  appId: "1:772639561354:web:d2b70e03e6cf1728e9bf73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();