import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDEgc8jq0r0Osqq8zznNr-MBOm-HC_2iJ4",
  authDomain: "super-computer-c6a99.firebaseapp.com",
  databaseURL: "https://super-computer-c6a99-default-rtdb.firebaseio.com",
  projectId: "super-computer-c6a99",
  storageBucket: "super-computer-c6a99.firebasestorage.app",
  messagingSenderId: "1031109156972",
  appId: "1:1031109156972:web:db0e26ac43332830443849",
  measurementId: "G-6QDLR8M346"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
export default app;