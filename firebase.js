// firebase.js — инициализация Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 🔑 Вставьте СВОЮ конфигурацию
const firebaseConfig = {
  apiKey: "AIzaSyDOF1Vxk4FPoDd5imnm3TdjtsQDjC8qmdI",
  authDomain: "fants-game.firebaseapp.com",
  projectId: "fants-game",
  storageBucket: "fants-game.firebasestorage.app",
  messagingSenderId: "143359324758",
  appId: "1:143359324758:web:4c7b69c4d091ce712f41f7",
  measurementId: "G-TKHG5KNRZP"
};


// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// Экспортируем для script.js
export { auth, db, provider, signInWithPopup, onAuthStateChanged, ref, set, onValue };