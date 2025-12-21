document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Игра загружена");

  let state = {
    code: '',
    playerNames: [],
    sessionName: '',
    fants: [],
    currentPlayerIndex: 0,
    easy: ["подпрыгнуть", "спеть куплет", "сказать комплимент"],
    hot: ["поцеловать в щёчку", "объятия 10 сек", "массаж плеч"],
    fire: ["танец под музыку", "лечь отдохнуть на коленях", "съесть ложку сахара"]
  };

  // ✅ Автосохранение
  const saveState = () => {
    if (state.sessionName) {
      try {
        localStorage.setItem(`game_${state.sessionName}`, JSON.stringify({
          playerNames: state.playerNames,
          fants: state.fants,
          currentPlayerIndex: state.currentPlayerIndex,
          easy: state.easy,
          hot: state.hot,
          fire: state.fire
        }));
        // Сохраняем список имён
        const names = JSON.parse(localStorage.getItem('saved_games') || '[]');
        if (!names.includes(state.sessionName)) {
          names.push(state.sessionName);
          localStorage.setItem('saved_games', JSON.stringify(names));
        }
        console.log("💾 Автосейв:", state.sessionName);
      } catch (e) {
        console.warn("⚠️ Не удалось сохранить:", e.message);
      }
    }
  };

  // ✅ Загрузка черновика
  const loadState = (sessionName) => {
    try {
      const data = localStorage.getItem(`game_${sessionName}`);
      if (data) {
        const saved = JSON.parse(data);
        state.playerNames = saved.playerNames || [];
        state.fants = saved.fants || [];
        state.currentPlayerIndex = saved.currentPlayerIndex || 0;
        state.easy = saved.easy || state.easy;
        state.hot = saved.hot || state.hot;
        state.fire = saved.fire || state.fire;
        state.sessionName = sessionName;
        return true;
      }
    } catch (e) {
      console.warn("⚠️ Ошибка загрузки:", e.message);
    }
    return false;
  };

  // ✅ Показать экран
  const showScreen = (screenId) => {
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.remove('active');
      el.style.display = 'none';
    });
    const screen = document.getElementById(screenId);
    screen.style.display = 'block';
    setTimeout(() => screen.classList.add('active'), 10);
  };

  // 🔐 Блокировка
  const codeInput = document.getElementById('codeInput');
  const unlockBtn = document.getElementById('unlockBtn');

  if (!codeInput || !unlockBtn) {
    console.error("❌ Элементы не найдены!");
    return;
  }

  codeInput.addEventListener('input', () => {
    state.code = codeInput.value.trim().toLowerCase();
    unlockBtn.disabled = state.code !== 'суббота';
  });

  unlockBtn.addEventListener('click', () => {
    if (state.code === 'суббота') {
      showScreen('main');
      // Обновляем список сохранённых игр
      updateSavedList();
    }
  });

  // 🏠 Главное меню
  document.getElementById('newGameBtn').addEventListener('click', () => {
    showScreen('names');
  });

  document.getElementById('backToMain').addEventListener('click', () => {
    showScreen('main');
    updateSavedList();
  });

  // 👥 Ввод имён
  document.getElementById('nextNamesBtn').addEventListener('click', () => {
    const names = [
      document.getElementById('boy1').value.trim(),
      document.getElementById('girl1').value.trim(),
      document.getElementById('boy2').value.trim(),
      document.getElementById('girl2').value.trim()
    ];
    const session = document.getElementById('sessionName').value.trim();

    if (names.some(n => !n)) {
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

    saveState(); // ✅ Сохраняем сразу после названия!
    showScreen('fants');
    updateUI();
  });

  // 🖊️ Ввод фантов
  const updateUI = () => {
    if (state.playerNames.length > 0 && state.playerNames[state.currentPlayerIndex]) {
      document.getElementById('currentPlayer').textContent = state.playerNames[state.currentPlayerIndex];
      document.getElementById('counter').textContent = state.fants.length;
      
      const list = document.getElementById('fantList');
      list.innerHTML = state.fants.map(f => 
        `<div class="fant-item">${f}</div>`
      ).join('');
    }
  };

  // ✅ КНОПКА НАЗАД — НОВАЯ
  document.getElementById('backToNamesBtn').addEventListener('click', () => {
    // Сохраняем текущий прогресс
    saveState();
    showScreen('names');
    // Восстанавливаем поля
    ['boy1','girl1','boy2','girl2'].forEach((id, i) => {
      if (state.playerNames[i]) document.getElementById(id).value = state.playerNames[i];
    });
    if (state.sessionName) document.getElementById('sessionName').value = state.sessionName;
  });

  document.getElementById('addFantBtn').addEventListener('click', () => {
    const text = document.getElementById('fantInput').value.trim();
    if (text) {
      state.fants.push(text);
      document.getElementById('fantInput').value = '';
      saveState(); // ✅ Автосохранение после каждого фанта!
      updateUI();
    }
  });

  document.querySelectorAll('.hint-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const list = state[cat];
      if (list.length === 0) {
        alert('✅ Все фанты в этой категории использованы');
        return;
      }

      const idx = Math.floor(Math.random() * list.length);
      const fant = list[idx];
      state.fants.push(fant);
      state[cat].splice(idx, 1);
      saveState(); // ✅ Автосохранение!
      updateUI();
    });
  });

  document.getElementById('doneFantsBtn').addEventListener('click', () => {
    if (state.fants.length === 0) {
      alert('❗ Нужно хотя бы 1 фант');
      return;
    }
    showScreen('voting');
  });

  // ✅ Обновление списка сохранённых игр
  const updateSavedList = () => {
    const names = JSON.parse(localStorage.getItem('saved_games') || '[]');
    const listEl = document.getElementById('savedList');
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
  };

  // ✅ Загрузка игры по клику
  window.loadGame = (name) => {
    if (loadState(name)) {
      showScreen('fants');
      updateUI();
    } else {
      alert('❌ Не удалось загрузить: ' + name);
    }
  };

  // 🔄 Инициализация
  updateUI();
});