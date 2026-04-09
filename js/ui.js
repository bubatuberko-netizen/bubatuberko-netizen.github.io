/* ===================================================
   ui.js — Menu system, HUD updates, screen transitions
   =================================================== */

'use strict';

const UI = (() => {

  /* ---------- DOM References ---------- */
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const menuScreen       = $('#menu-screen');
  const classScreen      = $('#class-screen');
  const leaderboardScreen= $('#leaderboard-screen');
  const gameScreen       = $('#game-screen');
  const usernameModal    = $('#username-modal');
  const usernameInput    = $('#username-input');
  const usernameError    = $('#username-error');
  const deathOverlay     = $('#death-overlay');
  const pauseOverlay     = $('#pause-overlay');

  const hudClassName     = $('#hud-class-name');
  const hudHealthFill    = $('#hud-health-fill');
  const hudHealthText    = $('#hud-health-text');
  const hudUsername       = $('#hud-username');
  const hudScore         = $('#hud-score');
  const hudWave          = $('#hud-wave');
  const deathScore       = $('#death-score');
  const deathWave        = $('#death-wave');
  const lbBody           = $('#leaderboard-body');
  const lbEmpty          = $('#leaderboard-empty');

  /* ---------- State ---------- */
  let selectedClass = 'gunslinger';
  let username      = localStorage.getItem('dustyduel_username') || '';

  /* ---------- Screen Management ---------- */

  function showScreen(screen) {
    [menuScreen, classScreen, leaderboardScreen, gameScreen].forEach(s => {
      s.classList.add('hidden');
      s.classList.remove('active');
    });
    screen.classList.remove('hidden');
    screen.classList.add('active');
  }

  function showMenu()        { showScreen(menuScreen); hidePause(); }
  function showClassSelect() { showScreen(classScreen); }
  function showLeaderboard() {
    renderLeaderboard();
    showScreen(leaderboardScreen);
  }
  function showGame()        {
    showScreen(gameScreen);
    deathOverlay.classList.add('hidden');
    hidePause();
  }

  function showPause() { pauseOverlay.classList.remove('hidden'); }
  function hidePause() { pauseOverlay.classList.add('hidden'); }

  function showUsernameModal() {
    usernameInput.value = username;
    usernameError.classList.add('hidden');
    usernameModal.classList.remove('hidden');
    usernameInput.focus();
  }
  function hideUsernameModal() { usernameModal.classList.add('hidden'); }

  /* ---------- Username Validation ---------- */

  function validateUsername(name) {
    return /^[a-zA-Z0-9_]{2,16}$/.test(name);
  }

  function getUsername() { return username; }
  function getSelectedClass() { return selectedClass; }

  /* ---------- HUD ---------- */

  function updateHUD(player, score, wave) {
    const hpPct = (player.health / player.maxHealth) * 100;
    hudHealthFill.style.width = hpPct + '%';

    // Color gradient: green → yellow → red
    if (hpPct > 50) {
      hudHealthFill.style.background = `linear-gradient(90deg, #44bb44, #66dd66)`;
    } else if (hpPct > 25) {
      hudHealthFill.style.background = `linear-gradient(90deg, #ccaa22, #ddcc44)`;
    } else {
      hudHealthFill.style.background = `linear-gradient(90deg, #cc2222, #ee4444)`;
    }

    hudHealthText.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
    hudScore.textContent = `Score: ${score}`;
    hudWave.textContent  = `Wave: ${wave}`;
  }

  function initHUD(className) {
    hudClassName.textContent = className;
    hudUsername.textContent = username;
  }

  /* ---------- Death Screen ---------- */

  function showDeath(score, wave) {
    deathScore.textContent = `Score: ${score}`;
    deathWave.textContent  = `Survived to Wave ${wave}`;
    deathOverlay.classList.remove('hidden');
  }

  /* ---------- Leaderboard Rendering ---------- */

  function renderLeaderboard() {
    const scores = Leaderboard.getScores();
    lbBody.innerHTML = '';

    if (scores.length === 0) {
      lbEmpty.classList.remove('hidden');
      return;
    }

    lbEmpty.classList.add('hidden');

    scores.forEach((entry, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${escapeHTML(entry.name)}</td><td>${entry.score}</td><td>${entry.date}</td>`;
      lbBody.appendChild(tr);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Screen Shake ---------- */

  let shakeTimeout = null;
  function triggerShake() {
    const canvas = $('#game-canvas');
    canvas.classList.remove('shake');
    void canvas.offsetWidth; // force reflow
    canvas.classList.add('shake');
    if (shakeTimeout) clearTimeout(shakeTimeout);
    shakeTimeout = setTimeout(() => canvas.classList.remove('shake'), 150);
  }

  /* ---------- Init — Wire up button events ---------- */

  function init(callbacks) {
    // Play button → show username modal if needed, then start game
    $('#btn-play').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      if (!username || !validateUsername(username)) {
        showUsernameModal();
      } else {
        callbacks.onPlay();
      }
    });

    // Username modal OK
    $('#btn-username-ok').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      const val = usernameInput.value.trim();
      if (!validateUsername(val)) {
        usernameError.classList.remove('hidden');
        return;
      }
      username = val;
      localStorage.setItem('dustyduel_username', username);
      hideUsernameModal();
      callbacks.onPlay();
    });

    usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#btn-username-ok').click();
    });

    $('#btn-username-cancel').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      hideUsernameModal();
    });

    // Class selection
    $('#btn-class-select').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      showClassSelect();
    });

    $$('.class-card').forEach(card => {
      card.addEventListener('click', () => {
        Utils.AudioMgr.playClick();
        $$('.class-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedClass = card.dataset.class;
      });
    });

    $('#btn-class-back').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      showMenu();
    });

    // Leaderboard
    $('#btn-leaderboard').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      showLeaderboard();
    });

    $('#btn-lb-back').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      showMenu();
    });

    // Death screen
    $('#btn-retry').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      callbacks.onPlay();
    });

    $('#btn-to-menu').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      if (callbacks.onQuitToMenu) callbacks.onQuitToMenu();
      showMenu();
    });

    // HUD menu button — pause the game
    $('#btn-hud-menu').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      if (callbacks.onPause) callbacks.onPause();
    });

    // Pause overlay — Resume
    $('#btn-resume').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      if (callbacks.onResume) callbacks.onResume();
    });

    // Pause overlay — Main Menu
    $('#btn-pause-menu').addEventListener('click', () => {
      Utils.AudioMgr.playClick();
      if (callbacks.onQuitToMenu) callbacks.onQuitToMenu();
      showMenu();
    });

    // Set default class selection highlight
    $$('.class-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.class === selectedClass);
    });
  }

  return {
    init,
    showMenu, showGame, showDeath,
    showPause, hidePause,
    updateHUD, initHUD,
    getUsername, getSelectedClass,
    triggerShake
  };
})();
