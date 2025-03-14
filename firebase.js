// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBz--WYXpGHdgaoU4hnwordscqNk6fi4kY",
  authDomain: "rag-pdf-c5beb.firebaseapp.com",
  projectId: "rag-pdf-c5beb",
  storageBucket: "rag-pdf-c5beb.firebasestorage.app",
  messagingSenderId: "67141162943",
  appId: "1:67141162943:web:67092af2f57968d17fb30a",
  measurementId: "G-BYSS8KCHMS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
