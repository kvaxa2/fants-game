// ✅ Единый script.js — блокировка, ввод, голосование, результаты + Firebase
// Работает с: index.html, voting.html, results.html

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

async function loadFantLists() {
  try {
    const response = await fetch('fants.json?_=' + Date.now());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    gameState.easyFants = data.easy || [];
    gameState.hotFants = data.hot || [];
    gameState.fireFants = data.fire || [];
  } catch (e) {
    console.warn("⚠️ Используем встроенные фанты");
    gameState.easyFants = ["подпрыгни", "ляж на спину", "спой куплет"];
    gameState.hotFants = ["отжимайся", "беги", "поцелуй в щёчку"];
    gameState.fireFants = ["отожмись 10 раз", "танец под музыку", "лечь отдохнуть на коленях"];
  }
  gameState.availableEasy = [...gameState.easyFants];
  gameState.availableHot = [...gameState.hotFants];
  gameState.availableFire = [...gameState.fireFants];
}

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
    } catch (e) {}
  }

  if (typeof firebase !== 'undefined' && firebase.auth) {
    try {
      const user = firebase.auth().currentUser;
      if (user) {
        const db = firebase.database();
        const ref = db.ref('users/' + user.uid + '/games/' + gameState.sessionName);
        ref.set({
          sessionName: gameState.sessionName,
          playerNames: gameState.playerNames,
          fants: gameState.fants,
          scores: gameState.scores,
          revealed: gameState.revealed,
          votes: gameState.votes
        });
      }
    } catch (e) {
      console.warn("Облако: не удалось сохранить", e);
    }
  }
}

function loadState(sessionName) {
  try {
    const data = localStorage.getItem(`game_${sessionName}`);
    if (data) {
      const saved = JSON.parse(data);
      Object.assign(gameState, saved);
      return true;
    }
  } catch (e) {}
  return false;
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none';
  });
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.style.display = 'block';
    setTimeout(() => screen.classList.add('active'), 10);
  }
}

// 🔐 БЛОКИРОВКА
if (currentPage === 'index.html' || currentPage === '') {
  document.addEventListener('DOMContentLoaded', async () => {
    await loadFantLists();

    document.getElementById('googleLoginBtn')?.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithRedirect(provider)
    .catch(error => {
      console.error("Ошибка входа:", error);
      alert('❌ Не удалось войти через Google');
    });
});

    const codeInput = document.getElementById('codeInput');
    const unlockBtn = document.getElementById('unlockBtn');

    if (codeInput && unlockBtn) {
      codeInput.addEventListener('input', () => {
        const code = codeInput.value.trim().toLowerCase();
        unlockBtn.disabled = code !== 'суббота';
      });

      unlockBtn.addEventListener('click', () => {
        const code = codeInput.value.trim().toLowerCase();
        if (code === 'суббота') {
          showScreen('main');
          updateSavedList();
        } else {
          alert('❌ Неверный код');
        }
      });
    }

    document.getElementById('newGameBtn')?.addEventListener('click', () => {
      showScreen('names');
    });

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

    const updateUI = () => {
      document.getElementById('currentPlayer').textContent = 
        gameState.playerNames[0] || '—';
      document.getElementById('counter').textContent = gameState.fants.length;
      const list = document.getElementById('fantList');
      if (list) list.innerHTML = '';
    };

    document.getElementById('backToNamesBtn')?.addEventListener('click', () => {
      saveState();
      showScreen('main');
    });

    document.getElementById('addFantBtn')?.addEventListener('click', () => {
      const text = document.getElementById('fantInput')?.value.trim();
      if (text) {
        gameState.fants.push(text);
        document.getElementById('fantInput').value = '';
        saveState();
        updateUI();
      }
    });

    const showFantDialog = (category) => {
      const dialog = document.getElementById('fantDialog');
      const list = document.getElementById('dialogList');

      let availableList = [];
      switch (category) {
        case 'easy': availableList = [...gameState.availableEasy]; break;
        case 'hot': availableList = [...gameState.availableHot]; break;
        case 'fire': availableList = [...gameState.availableFire]; break;
        default: return;
      }

      for (let i = availableList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableList[i], availableList[j]] = [availableList[j], availableList[i]];
      }

      list.innerHTML = availableList.map(fant => 
        `<div class="fant-item" data-fant="${fant}" style="cursor:pointer;padding:12px;background:#2d2d2d;margin:6px 0;border-radius:8px;">${fant}</div>`
      ).join('');

      list.querySelectorAll('.fant-item').forEach(item => {
        item.addEventListener('click', () => {
          const selected = item.dataset.fant;
          gameState.fants.push(selected);

          switch (category) {
            case 'easy': gameState.availableEasy = gameState.availableEasy.filter(f => f !== selected); break;
            case 'hot': gameState.availableHot = gameState.availableHot.filter(f => f !== selected); break;
            case 'fire': gameState.availableFire = gameState.availableFire.filter(f => f !== selected); break;
          }

          saveState();
          updateUI();
          showFantDialog(category);
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
      if (gameState.fants.length === 0) {
        alert('❗ Нужно хотя бы 1 фант');
        return;
      }

      for (let i = gameState.fants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.fants[i], gameState.fants[j]] = [gameState.fants[j], gameState.fants[i]];
      }

      saveState();
      const url = `voting.html?session=${encodeURIComponent(gameState.sessionName)}&playerNames=${encodeURIComponent(gameState.playerNames.join(';'))}`;
      window.location.href = url;
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
      try {
        const dataStr = localStorage.getItem(`game_${name}`);
        if (!dataStr) throw new Error('Not found');

        const data = JSON.parse(dataStr);

        if (data.fants_raw) {
          const fantsRaw = data.fants_raw;
          const fants = [];
          const scores = {};
          const revealed = {};

          fantsRaw.split(';').forEach(part => {
            if (part.includes('=')) {
              const [fant, rest] = part.split('=', 2);
              const [scoreStr, revealedStr] = rest.split(':', 2);
              const score = parseInt(scoreStr) || 0;
              const isRevealed = revealedStr === '1';
              fants.push(fant);
              scores[fant] = score;
              revealed[fant] = isRevealed;
            }
          });

          gameState.sessionName = name;
          gameState.playerNames = data.playerNames || [];
          gameState.fants = fants;
          gameState.scores = scores;
          gameState.revealed = revealed;

          const params = new URLSearchParams();
          params.set('session', name);
          params.set('scores', JSON.stringify(scores));
          params.set('revealed', JSON.stringify(revealed));
          params.set('fants', JSON.stringify(fants));

          window.location.href = `results.html?${params.toString()}`;
        } else {
          if (loadState(name)) {
            showScreen('fants');
            updateUI();
          } else {
            throw new Error('Load failed');
          }
        }
      } catch (e) {
        alert('❌ Не удалось загрузить: ' + name);
      }
    };

    updateUI();
  });
}

// 🗳️ ГОЛОСОВАНИЕ
if (currentPage === 'voting.html') {
  document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionName = urlParams.get('session');
    const playerNamesStr = urlParams.get('playerNames');

    if (!sessionName || !playerNamesStr) {
      alert('❌ Ошибка: нет данных сессии');
      window.location.href = 'index.html';
      return;
    }

    loadState(sessionName);
    gameState.playerNames = playerNamesStr.split(';');
    gameState.sessionName = sessionName;

    if (Object.keys(gameState.votes).length === 0) {
      gameState.votes = {};
      gameState.fants.forEach(fant => {
        gameState.votes[fant] = [0, 0, 0, 0];
      });
    }

    let currentPlayer = 0;
    let currentFantIndex = 0;

    function showPlayerTurn() {
      document.getElementById('turnPlayer').textContent = 
        gameState.playerNames[currentPlayer] || `Игрок ${currentPlayer + 1}`;
      showScreen('playerTurn');
    }

    function updateVotingUI() {
      if (currentFantIndex >= gameState.fants.length) {
        currentPlayer++;
        if (currentPlayer < 4) {
          currentFantIndex = 0;
          showPlayerTurn();
        } else {
          finishVoting();
        }
        return;
      }

      const currentFant = gameState.fants[currentFantIndex];
      const remaining = gameState.fants.length - currentFantIndex;

      document.getElementById('votingPlayer').textContent = 
        gameState.playerNames[currentPlayer] || `Игрок ${currentPlayer + 1}`;
      document.getElementById('remainingCount').textContent = remaining;
      document.getElementById('currentFant').textContent = currentFant;

      showScreen('voting');
    }

    function vote(score) {
      const currentFant = gameState.fants[currentFantIndex];
      gameState.votes[currentFant][currentPlayer] = score;
      currentFantIndex++;
      saveState();
      updateVotingUI();
    }

    function finishVoting() {
      const scores = {};
      const revealed = {};
      const finalFants = [];

      for (const fant of gameState.fants) {
        const votes = gameState.votes[fant];
        const rejected = votes.includes(-1);
        if (!rejected) {
          const total = votes.reduce((a, b) => a + (b > 0 ? b : 0), 0);
          scores[fant] = total;
          revealed[fant] = false;
          finalFants.push(fant);
        }
      }

      gameState.scores = scores;
      gameState.revealed = revealed;
      gameState.fants = finalFants;

      saveState();

      const params = new URLSearchParams();
      params.set('session', sessionName);
      params.set('scores', JSON.stringify(scores));
      params.set('revealed', JSON.stringify(revealed));
      params.set('fants', JSON.stringify(finalFants));

      window.location.href = `results.html?${params.toString()}`;
    }

    document.getElementById('startTurnBtn')?.addEventListener('click', () => {
      updateVotingUI();
    });

    document.getElementById('rejectBtn')?.addEventListener('click', () => vote(-1));
    document.getElementById('easyBtn')?.addEventListener('click', () => vote(1));
    document.getElementById('hotBtn')?.addEventListener('click', () => vote(2));
    document.getElementById('fireBtn')?.addEventListener('click', () => vote(3));

    setTimeout(showPlayerTurn, 100);
  });
}

// 📊 РЕЗУЛЬТАТЫ
if (currentPage === 'results.html') {
  document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionName = urlParams.get('session');
    const scoresStr = urlParams.get('scores');
    const revealedStr = urlParams.get('revealed');
    const fantsStr = urlParams.get('fants');

    if (!sessionName || !scoresStr || !revealedStr || !fantsStr) {
      alert('❌ Ошибка: нет данных');
      window.location.href = 'index.html';
      return;
    }

    gameState.sessionName = sessionName;
    gameState.scores = JSON.parse(scoresStr);
    gameState.revealed = JSON.parse(revealedStr);
    gameState.fants = JSON.parse(fantsStr);

    function showCategory(tab, min, max) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });

      const list = document.getElementById('fantListContainer');
      const filtered = gameState.fants.filter(fant => {
        const score = gameState.scores[fant] || 0;
        return score >= min && score <= max;
      }).sort(() => Math.random() - 0.5);

      list.innerHTML = filtered.map(fant => 
        `<div class="fant-item ${gameState.revealed[fant] ? 'revealed' : 'hidden'}" data-fant="${fant}">
          ${gameState.revealed[fant] ? fant : '******'}
        </div>`
      ).join('');

      list.querySelectorAll('.fant-item').forEach(item => {
        item.addEventListener('click', () => {
          const fant = item.dataset.fant;
          
          if (gameState.revealed[fant]) {
            alert(fant);
            return;
          }

          const dialog = document.getElementById('fantActionDialog');
          document.getElementById('dialogFantText').textContent = fant;
          
          const revealBtn = document.getElementById('dialogRevealBtn');
          const deleteBtn = document.getElementById('dialogDeleteBtn');
          
          revealBtn.onclick = null;
          deleteBtn.onclick = null;
          
          revealBtn.onclick = () => {
            gameState.revealed[fant] = true;
            saveState();
            showCategory(tab, min, max);
            dialog.close();
          };
          
          deleteBtn.onclick = () => {
            dialog.close();
            
            const confirmDialog = document.getElementById('confirmDeleteDialog');
            document.getElementById('confirmFantText').textContent = `«${fant}» будет удалён навсегда.`;
            
            document.getElementById('confirmNoBtn').onclick = () => confirmDialog.close();
            document.getElementById('confirmYesBtn').onclick = () => {
              gameState.fants = gameState.fants.filter(f => f !== fant);
              delete gameState.scores[fant];
              delete gameState.revealed[fant];
              saveState();
              showCategory(tab, min, max);
              confirmDialog.close();
            };
            
            confirmDialog.showModal();
          };
          
          dialog.showModal();
        });
      });
    }

    document.querySelector('[data-tab="easy"]')?.addEventListener('click', () => showCategory('easy', 1, 6));
    document.querySelector('[data-tab="hot"]')?.addEventListener('click', () => showCategory('hot', 7, 9));
    document.querySelector('[data-tab="fire"]')?.addEventListener('click', () => showCategory('fire', 10, 999));

    document.getElementById('saveResultsBtn')?.addEventListener('click', () => {
      const name = gameState.sessionName || prompt('Название игры:');
      if (!name) return;

      const fantsRaw = gameState.fants.map(fant => 
        `${fant}=${gameState.scores[fant]}:${gameState.revealed[fant] ? '1' : '0'}`
      ).join(';');

      try {
        localStorage.setItem(`game_${name}`, JSON.stringify({
          sessionName: name,
          playerNames: gameState.playerNames,
          fants_raw: fantsRaw
        }));

        const names = JSON.parse(localStorage.getItem('saved_games') || '[]');
        if (!names.includes(name)) {
          names.push(name);
          localStorage.setItem('saved_games', JSON.stringify(names));
        }

        alert(`✅ «${name}» сохранено`);
      } catch (e) {
        alert('❌ Ошибка сохранения');
      }
    });

    setTimeout(() => showCategory('easy', 1, 6), 100);
  });
  // ✅ Обработка редиректа после входа
if (currentPage === 'index.html' || currentPage === '') {
  firebase.auth().getRedirectResult()
    .then(result => {
      if (result.user) {
        console.log("✅ Вошли через редирект", result.user.email);
        // Можно обновить UI или перезагрузить страницу
        window.location.reload();
      }
    })
    .catch(error => {
      console.error("Ошибка редиректа:", error);
    });
}
}