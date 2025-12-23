console.log("версия 2 — с онлайн-комнатами");

// ================
// 🌐 ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ================
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

// 🔑 Режимы:
// 'locked' — экран блокировки
// 'solo'   — персональная игра (по умолчанию после разблокировки)
// 'online' — онлайн-комната
let currentMode = 'locked';
let currentRoomId = null;

let firebaseUser = null;

// ================
// 🔐 FIREBASE AUTH
// ================
if (typeof firebase !== 'undefined' && firebase.auth) {
  firebase.auth().onAuthStateChanged(user => {
    firebaseUser = user || null;
    console.log("☁️ Auth state changed:", user ? user.email : 'anon');
    if (user && currentMode === 'solo') {
      loadGamesFromCloud(user.uid);
    }
  });
}

// ================
// ☁️ ЗАГРУЗКА ИГР ИЗ ОБЛАКА (соло)
// ================
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
      if (typeof updateSavedList === 'function') updateSavedList();
    })
    .catch(err => {
      console.warn("Firebase load error", err);
    });
}

// ================
// 📥 ЗАГРУЗКА ФАНТОВ
// ================
async function loadFantLists() {
  try {
    const response = await fetch('fants.json?_=' + Date.now());
    if (!response.ok) throw new Error();
    const data = await response.json();
    gameState.easyFants = data.easy || [];
    gameState.hotFants = data.hot || [];
    gameState.fireFants = data.fire || [];
  } catch (e) {
    console.warn("Не удалось загрузить fants.json → fallback", e);
    gameState.easyFants = ["подпрыгни", "ляж на спину", "спой куплет"];
    gameState.hotFants = ["отжимайся", "беги", "поцелуй в щёчку"];
    gameState.fireFants = ["отожмись 10 раз", "танец под музыку"];
  }

  gameState.availableEasy = [...gameState.easyFants];
  gameState.availableHot = [...gameState.hotFants];
  gameState.availableFire = [...gameState.fireFants];
}

// ================
// 💾 СОХРАНЕНИЕ (универсальное)
// ================
function saveState() {
  if (!gameState.sessionName) return;

  const data = {
    sessionName: gameState.sessionName,
    playerNames: gameState.playerNames,
    fants: gameState.fants,
    votes: gameState.votes,
    scores: gameState.scores,
    revealed: gameState.revealed,
    currentPlayer: gameState.currentPlayer,
    currentFantIndex: gameState.currentFantIndex,
    availableEasy: gameState.availableEasy,
    availableHot: gameState.availableHot,
    availableFire: gameState.availableFire
  };

  // 🧍 СОЛО-РЕЖИМ: локально + облако по UID
  if (currentMode === 'solo') {
    // → localStorage
    localStorage.setItem(`game_${gameState.sessionName}`, JSON.stringify(data));
    const names = JSON.parse(localStorage.getItem('saved_games') || '[]');
    if (!names.includes(gameState.sessionName)) {
      names.push(gameState.sessionName);
      localStorage.setItem('saved_games', JSON.stringify(names));
    }

    // → Firebase cloud (если авторизован)
    if (firebaseUser && firebase.database) {
      firebase.database()
        .ref(`users/${firebaseUser.uid}/games/${gameState.sessionName}`)
        .set(data)
        .then(() => console.log("☁️ Сохранено в облако (соло):", gameState.sessionName))
        .catch(e => console.warn("Firebase save error", e));
    }
  }

  // 🌐 ОНЛАЙН-РЕЖИМ: только в комнату
  if (currentMode === 'online' && currentRoomId) {
    if (!firebase.database) {
      alert('❌ Firebase недоступен. Проверьте подключение.');
      return;
    }
    firebase.database()
      .ref(`rooms/${currentRoomId}/gameState`)
      .set(data)
      .then(() => console.log("☁️ Сохранено в комнату:", currentRoomId))
      .catch(e => {
        console.error("Firebase room save error", e);
        alert('⚠️ Не удалось сохранить в комнату. Проверьте интернет.');
      });
  }
}

// ================
// 📂 ЗАГРУЗКА (соло)
// ================
function loadState(sessionName) {
  try {
    const data = localStorage.getItem(`game_${sessionName}`);
    if (data) {
      Object.assign(gameState, JSON.parse(data));
      return true;
    }
  } catch (e) {
    console.error("loadState error", e);
  }
  return false;
}

// ================
// 🌐 ЗАГРУЗКА ИЗ КОМНАТЫ (онлайн)
// ================
function loadGameStateFromRoom(roomId) {
  return new Promise((resolve, reject) => {
    if (!firebase.database) {
      reject(new Error('Firebase не инициализирован'));
      return;
    }

    firebase.database()
      .ref(`rooms/${roomId}/gameState`)
      .once('value')
      .then(snapshot => {
        if (!snapshot.exists()) {
          resolve(false);
          return;
        }
        const data = snapshot.val();
        Object.assign(gameState, data);
        resolve(true);
      })
      .catch(reject);
  });
}

// ================
// 🧭 ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
// ================
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

// ================
// 🎮 ГЛАВНЫЙ ЗАПУСК
// ================
document.addEventListener('DOMContentLoaded', async () => {
  await loadFantLists();

  // =============== 🔐 GOOGLE LOGIN ===============
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

  // =============== 🔐 СВОЙ АККАУНТ ===============
  document.getElementById('customLoginBtn')?.addEventListener('click', () => {
    document.getElementById('customLoginForm').style.display = 'flex';
    document.getElementById('formTitle').textContent = '🔐 Вход';
    document.getElementById('formSubmit').textContent = 'Войти';
    document.getElementById('passInput2').style.display = 'none';
    window.authMode = 'login';
  });

  document.getElementById('formCancel')?.addEventListener('click', () => {
    document.getElementById('customLoginForm').style.display = 'none';
  });

  document.getElementById('formToggle')?.addEventListener('click', () => {
    if (window.authMode === 'login') {
      window.authMode = 'register';
      document.getElementById('formTitle').textContent = '🆕 Регистрация';
      document.getElementById('formSubmit').textContent = 'Зарегистрироваться';
      document.getElementById('passInput2').style.display = 'block';
    } else {
      window.authMode = 'login';
      document.getElementById('formTitle').textContent = '🔐 Вход';
      document.getElementById('formSubmit').textContent = 'Войти';
      document.getElementById('passInput2').style.display = 'none';
    }
  });

  document.getElementById('formSubmit')?.addEventListener('click', async () => {
    const login = document.getElementById('loginInput').value.trim();
    const pass1 = document.getElementById('passInput1').value;
    const pass2 = document.getElementById('passInput2').value;

    if (!login || !/^[a-zA-Z0-9_-]{3,20}$/.test(login)) {
      alert('❌ Логин: 3–20 символов (латиница, цифры, _-)');
      return;
    }
    if (pass1.length < 6) {
      alert('❌ Пароль: минимум 6 символов');
      return;
    }
    if (window.authMode === 'register' && pass1 !== pass2) {
      alert('❌ Пароли не совпадают');
      return;
    }

    const email = `${login}@quick.fants`;

    try {
      let userCredential;
      if (window.authMode === 'register') {
        userCredential = await firebase.auth().createUserWithEmailAndPassword(email, pass1);
      } else {
        userCredential = await firebase.auth().signInWithEmailAndPassword(email, pass1);
      }

      document.getElementById('customLoginForm').style.display = 'none';
      document.getElementById('loginInput').value = '';
      document.getElementById('passInput1').value = '';
      document.getElementById('passInput2').value = '';
      alert(`✅ ${window.authMode === 'register' ? 'Регистрация' : 'Вход'} успешен!\nДобро пожаловать, ${login}!`);

    } catch (err) {
      console.error('Auth error:', err);
      let msg = '❌ ';
      switch (err.code) {
        case 'auth/email-already-in-use': msg += 'Логин занят'; break;
        case 'auth/user-not-found': msg += 'Пользователь не найден'; break;
        case 'auth/wrong-password': msg += 'Неверный пароль'; break;
        case 'auth/invalid-email': msg += 'Некорректный логин'; break;
        default: msg += err.message || 'Ошибка входа';
      }
      alert(msg);
    }
  });

  // =============== 🔑 РАЗБЛОКИРОВКА (код) ===============
  const codeInput = document.getElementById('codeInput');
  const unlockBtn = document.getElementById('unlockBtn');

  codeInput?.addEventListener('input', () => {
    unlockBtn.disabled = codeInput.value.trim().toLowerCase() !== 'суббота';
  });

  unlockBtn?.addEventListener('click', () => {
    if (codeInput.value.trim().toLowerCase() === 'суббота') {
      currentMode = 'solo';
      showScreen('main');
      if (typeof updateSavedList === 'function') updateSavedList();
    }
  });

  // =============== 🌐 КНОПКИ ОНЛАЙН-КОМНАТЫ ===============
  document.getElementById('onlineRoomBtn')?.addEventListener('click', () => {
    showScreen('onlineRoom');
  });

  document.getElementById('backToMainFromOnlineBtn')?.addEventListener('click', () => {
    showScreen('main');
  });

  document.getElementById('createRoomBtn')?.addEventListener('click', createOnlineRoom);
  document.getElementById('joinRoomBtn')?.addEventListener('click', joinOnlineRoom);

  // =============== 📁 "Мои игры" ===============
  let savedGamesExpanded = false;
  document.getElementById('savedGamesBtn')?.addEventListener('click', () => {
    const container = document.getElementById('savedGamesContainer');
    if (!container) return;

    savedGamesExpanded = !savedGamesExpanded;
    container.style.display = savedGamesExpanded ? 'block' : 'none';
    if (savedGamesExpanded && typeof updateSavedList === 'function') updateSavedList();
  });

  // =============== ➕ НОВАЯ ИГРА ===============
  document.getElementById('newGameBtn')?.addEventListener('click', () => {
    // Сбрасываем состояние (на случай, если остались следы прошлой игры)
    resetGameState();
    showScreen('names');
  });

  // =============== 👥 ВВОД ИМЁН ===============
  document.getElementById('nextNamesBtn')?.addEventListener('click', () => {
    const names = [
      document.getElementById('boy1')?.value.trim(),
      document.getElementById('girl1')?.value.trim(),
      document.getElementById('boy2')?.value.trim(),
      document.getElementById('girl2')?.value.trim()
    ];
    const session = document.getElementById('sessionName')?.value.trim();

    if (names.some(n => !n) || !session) {
      alert('❗ Заполните все поля');
      return;
    }

    gameState.playerNames = names;
    gameState.sessionName = session;
    resetFantLists(); // восстанавливаем доступные фанты

    saveState();

    // Редирект по режиму
    if (currentMode === 'online') {
      window.location.href = `voting.html?room=${currentRoomId}`;
    } else {
      window.location.href = `voting.html?session=${encodeURIComponent(session)}`;
    }
  });

  // =============== ✏️ ФАНТЫ (добавление) ===============
  const fantInput = document.getElementById('fantInput');
  const addFantBtn = document.getElementById('addFantBtn');
  const doneFantsBtn = document.getElementById('doneFantsBtn');

  addFantBtn?.addEventListener('click', () => {
    const text = fantInput?.value.trim();
    if (!text) return;
    gameState.fants.push(text);
    fantInput.value = '';
    saveState();
    updateUI();
  });

  doneFantsBtn?.addEventListener('click', () => {
    if (!gameState.fants.length) return alert('❗ Нет фантов');
    saveState();
    if (currentMode === 'online') {
      window.location.href = `voting.html?room=${currentRoomId}`;
    } else {
      window.location.href = `voting.html?session=${encodeURIComponent(gameState.sessionName)}`;
    }
  });

  // =============== 🔄 ОБНОВЛЕНИЕ UI ===============
  function updateUI() {
    const currentPlayerEl = document.getElementById('currentPlayer');
    const counterEl = document.getElementById('counter');
    if (currentPlayerEl) {
      currentPlayerEl.textContent = gameState.playerNames[0] || '—';
    }
    if (counterEl) {
      counterEl.textContent = gameState.fants.length;
    }
  }

  // =============== 📋 "Мои игры" ===============
  window.updateSavedList = function() {
    const listEl = document.getElementById('savedList');
    if (!listEl) return;

    const list = JSON.parse(localStorage.getItem('saved_games') || '[]');
    if (list.length === 0) {
      listEl.innerHTML = '<p style="text-align:center;color:#888;">Нет сохранённых игр</p>';
    } else {
      listEl.innerHTML = list.map(n =>
        `<button class="secondary" onclick="loadGame('${n}')">${n}</button>`
      ).join('');
    }
  };

  window.loadGame = function(name) {
    try {
      if (!loadState(name)) {
        throw new Error('Данные не найдены в localStorage');
      }

      const hasScores = gameState.scores && Object.keys(gameState.scores).length > 0;
      const hasRevealed = gameState.revealed && Object.keys(gameState.revealed).length > 0;

      if (hasScores && hasRevealed) {
        window.location.href = `results.html?session=${encodeURIComponent(name)}`;
      } else {
        showScreen('fants');
        updateUI();
      }
    } catch (e) {
      console.error('loadGame error:', e);
      alert('❌ Не удалось загрузить игру: ' + name);
    }
  };

  // =============== 🧹 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===============
  function resetGameState() {
    gameState = {
      code: '',
      sessionName: '',
      playerNames: [],
      fants: [],
      votes: {},
      currentPlayer: 0,
      currentFantIndex: 0,
      scores: {},
      revealed: {},
      easyFants: gameState.easyFants,
      hotFants: gameState.hotFants,
      fireFants: gameState.fireFants,
      availableEasy: [...gameState.easyFants],
      availableHot: [...gameState.hotFants],
      availableFire: [...gameState.fireFants]
    };
  }

  function resetFantLists() {
    gameState.availableEasy = [...gameState.easyFants];
    gameState.availableHot = [...gameState.hotFants];
    gameState.availableFire = [...gameState.fireFants];
  }

  // =============== 🌐 ОНЛАЙН-КОМНАТЫ ===============
  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X').slice(0, 6);
  }

  function createOnlineRoom() {
    const code = generateRoomCode();
    initOnlineRoom(code, true);
  }

  function joinOnlineRoom() {
    const code = document.getElementById('roomCodeInput')?.value?.trim().toUpperCase();
    if (!code || code.length !== 6) {
      alert('❌ Код должен быть из 6 символов (латиница/цифры)');
      return;
    }
    initOnlineRoom(code, false);
  }

  function initOnlineRoom(roomId, isCreator) {
    const statusEl = document.getElementById('roomStatus');
    if (statusEl) statusEl.textContent = '⏳ Подключение...';

    const roomRef = firebase.database().ref(`rooms/${roomId}`);

    roomRef.once('value')
      .then(snapshot => {
        if (isCreator && snapshot.exists()) {
          // Коллизия — пересоздаём
          return createOnlineRoom();
        }
        if (!isCreator && !snapshot.exists()) {
          throw new Error('Комната не найдена');
        }
        if (snapshot.exists() && snapshot.val().status !== 'lobby') {
          throw new Error('Игра уже началась');
        }

        currentMode = 'online';
        currentRoomId = roomId;

        if (isCreator) {
          const playerId = firebaseUser?.uid || `guest_${Date.now().toString().slice(-4)}`;
          return roomRef.set({
            createdAt: Date.now(),
            createdBy: playerId,
            status: 'lobby',
            players: {},
            gameState: {}
          });
        }
      })
      .then(() => {
        if (statusEl) statusEl.textContent = '';
        alert(`✅ Вы в комнате: ${roomId}`);
        resetGameState();
        document.getElementById('sessionName').value = `Комната ${roomId}`;
        showScreen('names');
      })
      .catch(err => {
        console.error('Room error:', err);
        if (statusEl) statusEl.textContent = `❌ ${err.message || 'Неизвестная ошибка'}`;
      });
  }

  // === 🔙 КНОПКА "НАЗАД В МЕНЮ" ИЗ ЭКРАНА ФАНТОВ ===
  document.getElementById('backToNamesBtn')?.addEventListener('click', () => {
    showScreen('main');
  });

  // === 🔙 КНОПКА "НАЗАД В МЕНЮ" ИЗ ГОЛОСОВАНИЯ (заглушки) ===
  document.getElementById('backToMain')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
});