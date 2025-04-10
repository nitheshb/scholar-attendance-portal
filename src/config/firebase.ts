
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCRq2ZYVNS3MAt-2tBfmMydX-U-laz9O9s",
  authDomain: "chittiproject-99ff2.firebaseapp.com",
  projectId: "chittiproject-99ff2",
  storageBucket: "chittiproject-99ff2.firebasestorage.app",
  messagingSenderId: "73249371528",
  appId: "1:73249371528:web:bc70d2a832aca92b02363d",
  measurementId: "G-K8SNHKXHFQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
