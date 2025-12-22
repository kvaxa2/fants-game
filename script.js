console.log("версия 1");

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
      loadGamesFromCloud(user.uid);
    } else {
      console.log("🚫 Firebase: пользователь не авторизован");
    }
  });
}

// --------------------
// ☁️ CLOUD → LOCAL (SYNC)
// --------------------
function loadGamesFromCloud(uid) {
  firebase.database()
    .ref(`users/${uid}/games`)
    .once('value')
    .then(snapshot => {
      if (!snapshot.exists()) return;

      const games = snapshot.val();
      const savedNames = [];

      Object.keys(games).forEach(name => {
        localStorage.setItem(`game_${name}`, JSON.stringify(games[name]));
        savedNames.push(name);
      });

      localStorage.setItem('saved_games', JSON.stringify(savedNames));
      console.log("⬇️ Игры загружены из Firebase");
    })
    .catch(err => {
      console.warn("Firebase load error", err);
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
// 💾 СОХРАНЕНИЕ (LOCAL = CACHE, CLOUD = SOURCE)
// --------------------
function saveState() {
  if (!gameState.sessionName) return;

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

  // 💾 local cache
  localStorage.setItem(`game_${gameState.sessionName}`, JSON.stringify(data));

  const names = JSON.parse(localStorage.getItem('saved_games') || '[]');
  if (!names.includes(gameState.sessionName)) {
    names.push(gameState.sessionName);
    localStorage.setItem('saved_games', JSON.stringify(names));
  }

  // ☁️ cloud
  if (firebaseUser && firebase.database) {
    firebase.database()
      .ref(`users/${firebaseUser.uid}/games/${gameState.sessionName}`)
      .set(data)
      .then(() => {
        console.log("☁️ Сохранено в Firebase:", gameState.sessionName);
      })
      .catch(e => {
        console.warn("Firebase save error", e);
      });
  }
}

// --------------------
// 📂 ЗАГРУЗКА (LOCAL CACHE)
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
	  gameState.scores = {};
      gameState.revealed = {};
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
      location.href =
        `voting.html?session=${encodeURIComponent(gameState.sessionName)}&playerNames=${encodeURIComponent(gameState.playerNames.join(';'))}`;
    });

    function updateSavedList() {
      const list = JSON.parse(localStorage.getItem('saved_games') || '[]');
      const el = document.getElementById('savedList');
      if (!el) return;
      el.innerHTML = list.map(n =>
        `<button class="secondary" onclick="loadGame('${n}')">${n}</button>`
      ).join('');
    }

    window.loadGame = (name) => {
  try {
    if (!loadState(name)) {
      throw new Error('Data not found in localStorage');
    }

    // ✅ ПРОВЕРКА: игра завершена?
    const hasScores = gameState.scores && Object.keys(gameState.scores).length > 0;
    const hasRevealed = gameState.revealed && Object.keys(gameState.revealed).length > 0;

    if (hasScores && hasRevealed) {
      // 🟢 Игра завершена → открываем результаты
      console.log('✅ Игра завершена — открываем результаты');

      const params = new URLSearchParams();
      params.set('session', name);

      // Не передаём scores/revealed через URL — они уже в localStorage/Firebase
      window.location.href = `results.html?${params.toString()}`;
    } else {
      // 🟡 Игра не завершена → продолжаем редактирование
      console.log('🟡 Игра не завершена — открываем редактор фантов');
      showScreen('fants');
      updateUI();
    }
  } catch (e) {
    console.error('❌ loadGame error:', e);
    alert('❌ Не удалось загрузить игру: ' + name);
  }
};
  });
}
