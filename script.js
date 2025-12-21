document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Игра загружена");

  let state = {
    code: '',
    playerNames: [],
    sessionName: '',
    fants: [],
    currentPlayerIndex: 0,
    availableEasy: [],
    availableHot: [],
    availableFire: [],
    easyFants: [],
    hotFants: [],
    fireFants: []
  };

  // ✅ Загрузка фантов из fants.json
  const loadFantLists = async () => {
    try {
      const response = await fetch('fants.json?_=' + Date.now()); // обход кэша
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.easyFants = data.easy || [];
      state.hotFants = data.hot || [];
      state.fireFants = data.fire || [];

      state.availableEasy = [...state.easyFants];
      state.availableHot = [...state.hotFants];
      state.availableFire = [...state.fireFants];

      console.log("✅ Фанты загружены из fants.json");
      console.log("Easy:", state.easyFants.length, "Hot:", state.hotFants.length, "Fire:", state.fireFants.length);
    } catch (e) {
      console.warn("⚠️ fants.json не загружен — используем встроенные фанты");
      // Встроенные фанты (резерв)
      state.easyFants = ["подпрыгни", "ляж на спину", "спой куплет", "сделай комплимент"];
      state.hotFants = ["отжимайся", "беги 10 секунд", "поцелуй в щёчку", "объятия 10 сек"];
      state.fireFants = ["отожмись 10 раз", "танец под музыку", "лечь отдохнуть на коленях", "съешь ложку сахара"];
      state.availableEasy = [...state.easyFants];
      state.availableHot = [...state.hotFants];
      state.availableFire = [...state.fireFants];
    }
  };

  const saveState = () => {
    if (state.sessionName) {
      try {
        localStorage.setItem(`game_${state.sessionName}`, JSON.stringify({
          playerNames: state.playerNames,
          fants: state.fants,
          currentPlayerIndex: state.currentPlayerIndex,
          availableEasy: state.availableEasy,
          availableHot: state.availableHot,
          availableFire: state.availableFire
        }));
        const names = JSON.parse(localStorage.getItem('saved_games') || '[]');
        if (!names.includes(state.sessionName)) {
          names.push(state.sessionName);
          localStorage.setItem('saved_games', JSON.stringify(names));
        }
      } catch (e) {}
    }
  };

  const loadState = (sessionName) => {
    try {
      const data = localStorage.getItem(`game_${sessionName}`);
      if (data) {
        const saved = JSON.parse(data);
        state.playerNames = saved.playerNames || [];
        state.fants = saved.fants || [];
        state.currentPlayerIndex = saved.currentPlayerIndex || 0;
        state.availableEasy = saved.availableEasy || state.easyFants;
        state.availableHot = saved.availableHot || state.hotFants;
        state.availableFire = saved.availableFire || state.fireFants;
        state.sessionName = sessionName;
        return true;
      }
    } catch (e) {}
    return false;
  };

  const showScreen = (screenId) => {
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.remove('active');
      el.style.display = 'none';
    });
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.style.display = 'block';
      setTimeout(() => screen.classList.add('active'), 10);
    }
  };

  // 🔐 Блокировка
  const codeInput = document.getElementById('codeInput');
  const unlockBtn = document.getElementById('unlockBtn');

  if (codeInput && unlockBtn) {
    codeInput.addEventListener('input', () => {
      state.code = codeInput.value.trim().toLowerCase();
      unlockBtn.disabled = state.code !== 'суббота';
    });

    unlockBtn.addEventListener('click', () => {
      if (state.code === 'суббота') {
        showScreen('main');
        updateSavedList();
      }
    });
  }

  // 🏠 Главное меню
  document.getElementById('newGameBtn')?.addEventListener('click', () => {
    showScreen('names');
  });

  document.getElementById('backToMain')?.addEventListener('click', () => {
    showScreen('main');
    updateSavedList();
  });

  // 👥 Ввод имён
  document.getElementById('nextNamesBtn')?.addEventListener('click', () => {
    const names = [
      document.getElementById('boy1')?.value.trim(),
      document.getElementById('girl1')?.value.trim(),
      document.getElementById('boy2')?.value.trim(),
      document.getElementById('girl2')?.value.trim()
    ].filter(x => x);
    const session = document.getElementById('sessionName')?.value.trim();

    if (names.length < 4) {
      alert('❗ Заполните все имена');
      return;
    }
    if (!session) {
      alert('❗ Введите название игры');
      return;
    }

    state.playerNames = names;
    state.sessionName = session;
    state.currentPlayerIndex = 0;
    state.fants = [];

    state.availableEasy = [...state.easyFants];
    state.availableHot = [...state.hotFants];
    state.availableFire = [...state.fireFants];

    saveState();
    showScreen('fants');
    updateUI();
  });

  // 🖊️ Ввод фантов
  const updateUI = () => {
    if (state.playerNames.length > 0) {
      document.getElementById('currentPlayer').textContent = 
        state.playerNames[state.currentPlayerIndex] || '—';
      document.getElementById('counter').textContent = state.fants.length;
      
      // ✅ 4. Добавленные фанты НЕ отображаются — только счётчик
      const list = document.getElementById('fantList');
      if (list) list.innerHTML = ''; // Пустой список
    }
  };

  // ✅ 1. КНОПКА НАЗАД → в главное меню (а не к именам)
  document.getElementById('backToNamesBtn')?.addEventListener('click', () => {
    saveState();
    showScreen('main'); // ← главный экран
    updateSavedList();
  });

  document.getElementById('addFantBtn')?.addEventListener('click', () => {
    const text = document.getElementById('fantInput')?.value.trim();
    if (text) {
      state.fants.push(text);
      document.getElementById('fantInput').value = '';
      saveState();
      updateUI();
    }
  });

  // ✅ Диалог выбора фанта — НЕ закрывается после выбора
  const showFantDialog = (category) => {
    const dialog = document.getElementById('fantDialog');
    const title = document.getElementById('dialogTitle');
    const list = document.getElementById('dialogList');

    title.textContent = `Выберите фант (${category})`;

    let availableList = [];
    switch (category) {
      case 'easy': availableList = [...state.availableEasy]; break;
      case 'hot': availableList = [...state.availableHot]; break;
      case 'fire': availableList = [...state.availableFire]; break;
      default: return;
    }

    // Перемешиваем
    for (let i = availableList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableList[i], availableList[j]] = [availableList[j], availableList[i]];
    }

    list.innerHTML = availableList.map(fant => 
      `<div class="fant-item" data-fant="${fant}" style="cursor:pointer;padding:12px;background:#2d2d2d;margin:6px 0;border-radius:8px;">${fant}</div>`
    ).join('');

    // ✅ 3. Клик — добавляет фант, но НЕ закрывает диалог
    list.querySelectorAll('.fant-item').forEach(item => {
      item.addEventListener('click', () => {
        const selected = item.dataset.fant;
        state.fants.push(selected);

        // Удаляем из доступных
        switch (category) {
          case 'easy': state.availableEasy = state.availableEasy.filter(f => f !== selected); break;
          case 'hot': state.availableHot = state.availableHot.filter(f => f !== selected); break;
          case 'fire': state.availableFire = state.availableFire.filter(f => f !== selected); break;
        }

        saveState();
        updateUI(); // Обновляем счётчик

        // Обновляем список в диалоге (без закрытия)
        showFantDialog(category); // рекурсивно обновляем
      });
    });

    document.getElementById('dialogCancel')?.addEventListener('click', () => {
      dialog.style.display = 'none';
    });

    dialog.style.display = 'flex';
  };

  document.querySelectorAll('.hint-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      showFantDialog(cat);
    });
  });

  document.getElementById('doneFantsBtn')?.addEventListener('click', () => {
    if (state.fants.length === 0) {
      alert('❗ Нужно хотя бы 1 фант');
      return;
    }
    showScreen('voting');
  });

  const updateSavedList = () => {
    const names = JSON.parse(localStorage.getItem('saved_games') || '[]');
    const listEl = document.getElementById('savedList');
    if (listEl) {
      if (names.length > 0) {
        listEl.innerHTML = `
          <h3>💾 Мои игры (${names.length}):</h3>
          <div style="display:grid;gap:8px;margin-top:12px;">
            ${names.map(name => 
              `<button class="secondary" onclick="loadGame('${name}')">${name}</button>`
            ).join('')}
          </div>
        `;
        document.getElementById('savedGamesBtn').style.display = 'none';
      } else {
        listEl.innerHTML = '';
        document.getElementById('savedGamesBtn').style.display = 'block';
      }
    }
  };

  window.loadGame = (name) => {
    if (loadState(name)) {
      showScreen('fants');
      updateUI();
    } else {
      alert('❌ Не удалось загрузить: ' + name);
    }
  };

  // 🔄 Инициализация
  loadFantLists().then(() => {
    updateUI();
  });

  // Для отладки: нажмите F12 → Console → введите showState()
  window.showState = () => console.log("State:", state);
});