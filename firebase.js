// firebase.js — инициализация Firebase с правильным URL

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

// ✅ УКАЖИТЕ databaseURL ЯВНО
const app = initializeApp(firebaseConfig, {
  databaseURL: "https://fants-game-default-rtdb.europe-west1.firebasedatabase.app"
});

// Инициализация сервисов
const auth = getAuth(app);
const db = getDatabase(app); // ← Это ключевой момент!
const provider = new GoogleAuthProvider();

// Экспортируем для script.js
export { auth, db, provider, signInWithPopup, onAuthStateChanged, ref, set, onValue };