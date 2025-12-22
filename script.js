// ✅ Единый script.js — Firebase popup auth + вся существующая логика

const currentPage = window.location.pathname.split('/').pop();

let gameState = {
  code: '',
  sessionName: '',
  playerNames: [],
  fants: [],
  votes: {},
  currentPlayer: 0,
  currentFantIndex: 0,
  scores: {},
  revealed: {},
  easyFants: [],
  hotFants: [],
  fireFants: [],
  availableEasy: [],
  availableHot: [],
  availableFire: []
};

// --------------------
// 🔐 FIREBASE AUTH (POPUP)
// --------------------
let firebaseUser = null;

if (typeof firebase !== 'undefined' && firebase.auth) {
  firebase.auth().onAuthStateChanged(user => {
    firebaseUser = user || null;
    if (user) {
      console.log("☁️ Firebase: пользователь вошёл", user.email);
    } else {
      console.log("🚫 Firebase: пользователь не авторизован");
    }
  });
}

// --------------------
// 📥 Загрузка фантов
// --------------------
async function loadFantLists() {
  try {
    const response = await fetch('fants.json?_=' + Date.now());
    if (!response.ok) throw new Error();
    const data = await response.json();
    gameState.easyFants = data.easy || [];
    gameState.hotFants = data.hot || [];
    gameState.fireFants = data.fire || [];
  } catch {
    gameState.easyFants = ["подпрыгни", "ляж на спину", "спой куплет"];
    gameState.hotFants = ["отжимайся", "беги", "поцелуй в щёчку"];
    gameState.fireFants = ["отожмись 10 раз", "танец под музыку"];
  }

  gameState.availableEasy = [...gameState.easyFants];
  gameState.availableHot = [...gameState.hotFants];
  gameState.availableFire = [...gameState.fireFants];
}

// --------------------
// 💾 СОХРАНЕНИЕ (local + cloud)
// --------------------
function saveState() {
  if (gameState.sessionName) {
    try {
      const data = {
        sessionName: gameState.sessionName,
        playerNames: gameState.playerNames,
        fants: gameState.fants,
        availableEasy: gameState.availableEasy,
        availableHot: gameState.availableHot,
        availableFire: gameState.availableFire,
        votes: gameState.votes,
        scores: gameState.scores,
        revealed: gameState.revealed
      };

      localStorage.setItem(`game_${gameState.sessionName}`, JSON.stringify(data));

      const names = JSON.parse(localStorage.getItem('saved_games') || '[]');
      if (!names.includes(gameState.sessionName)) {
        names.push(gameState.sessionName);
        localStorage.setItem('saved_games', JSON.stringify(names));
      }
    } catch {}
  }

  // ☁️ Firebase
  if (firebaseUser && firebase.database && gameState.sessionName) {
    try {
      firebase.database()
        .ref(`users/${firebaseUser.uid}/games/${gameState.sessionName}`)
        .set({
          sessionName: gameState.sessionName,
          playerNames: gameState.playerNames,
          fants: gameState.fants,
          scores: gameState.scores,
          revealed: gameState.revealed,
          votes: gameState.votes
        });
    } catch (e) {
      console.warn("Firebase save error", e);
    }
  }
}

// --------------------
// 📂 ЗАГРУЗКА
// --------------------
function loadState(sessionName) {
  try {
    const data = localStorage.getItem(`game_${sessionName}`);
    if (data) {
      Object.assign(gameState, JSON.parse(data));
      return true;
    }
  } catch {}
  return false;
}

// --------------------
// 🧭 ЭКРАНЫ
// --------------------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none';
  });
  const s = document.getElementById(id);
  if (s) {
    s.style.display = 'block';
    setTimeout(() => s.classList.add('active'), 10);
  }
}

// =====================================================
// 🔐 INDEX
// =====================================================
if (currentPage === '' || currentPage === 'index.html') {
  document.addEventListener('DOMContentLoaded', async () => {
    await loadFantLists();

    // Google login (POPUP)
    document.getElementById('googleLoginBtn')?.addEventListener('click', () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .then(res => {
          alert(`✅ Вы вошли как ${res.user.displayName}`);
        })
        .catch(err => {
          console.error(err);
          alert('❌ Не удалось войти через Google');
        });
    });

    const codeInput = document.getElementById('codeInput');
    const unlockBtn = document.getElementById('unlockBtn');

    codeInput?.addEventListener('input', () => {
      unlockBtn.disabled = codeInput.value.trim().toLowerCase() !== 'суббота';
    });

    unlockBtn?.addEventListener('click', () => {
      if (codeInput.value.trim().toLowerCase() === 'суббота') {
        showScreen('main');
        updateSavedList();
      }
    });

    document.getElementById('newGameBtn')?.addEventListener('click', () => {
      showScreen('names');
    });

    document.getElementById('nextNamesBtn')?.addEventListener('click', () => {
      const names = [
        boy1.value.trim(),
        girl1.value.trim(),
        boy2.value.trim(),
        girl2.value.trim()
      ];

      const session = sessionName.value.trim();
      if (names.some(n => !n) || !session) {
        alert('❗ Заполните всё');
        return;
      }

      gameState.playerNames = names;
      gameState.sessionName = session;
      gameState.fants = [];
      gameState.availableEasy = [...gameState.easyFants];
      gameState.availableHot = [...gameState.hotFants];
      gameState.availableFire = [...gameState.fireFants];

      saveState();
      showScreen('fants');
      updateUI();
    });

    function updateUI() {
      document.getElementById('currentPlayer').textContent =
        gameState.playerNames[0] || '—';
      document.getElementById('counter').textContent =
        gameState.fants.length;
    }

    document.getElementById('addFantBtn')?.addEventListener('click', () => {
      const text = fantInput.value.trim();
      if (!text) return;
      gameState.fants.push(text);
      fantInput.value = '';
      saveState();
      updateUI();
    });

    document.getElementById('doneFantsBtn')?.addEventListener('click', () => {
      if (!gameState.fants.length) return alert('❗ Нет фантов');
      saveState();
      location.href = `voting.html?session=${encodeURIComponent(gameState.sessionName)}&playerNames=${encodeURIComponent(gameState.playerNames.join(';'))}`;
    });

    function updateSavedList() {
      const list = JSON.parse(localStorage.getItem('saved_games') || '[]');
      const el = document.getElementById('savedList');
      if (!el) return;
      el.innerHTML = list.map(n =>
        `<button class="secondary" onclick="loadGame('${n}')">${n}</button>`
      ).join('');
    }

    window.loadGame = name => {
      if (loadState(name)) {
        showScreen('fants');
        updateUI();
      }
    };
  });
}
