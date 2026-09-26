'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const GRID_COLOR = { dark: '#22222e', light: '#d8d8e4' };
const THEME_STORAGE_KEY = 'tetris-theme';
const SKIN_STORAGE_KEY = 'tetris-skin';
const DEFAULT_SKIN = 'retro';

// ---- Skins ----
// Each skin: colors (index 0 null), grid per theme, optional boardBg (forced
// board background, also applied via CSS [data-skin]) and drawBlock(context,
// px, py, size, color, alpha) drawing one cell at pixel position (px, py).

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, w, h, r);
  } else {
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }
}

const SKINS = {
  retro: {
    label: 'Retro',
    colors: COLORS,
    grid: GRID_COLOR,
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px + 1, py + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
  },
  neon: {
    label: 'Neon',
    colors: [null, '#00f0ff', '#fff200', '#d400ff', '#39ff14', '#ff073a', '#4d7cff', '#ff8c00'],
    grid: { dark: '#111122', light: '#111122' },
    boardBg: '#000000',
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + 3, py + 3, size - 6, size - 6);
      context.fillStyle = color;
      context.globalAlpha = alpha * 0.35;
      context.fillRect(px + 5, py + 5, size - 10, size - 10);
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.globalAlpha = 1;
    },
  },
  pastel: {
    label: 'Pastel',
    colors: [null, '#a8e6ef', '#fff1a8', '#d9b8f0', '#b8e6c1', '#f5b5b5', '#b5d0f5', '#ffd3a8'],
    grid: { dark: '#26263a', light: '#ece6f2' },
    drawBlock(context, px, py, size, color, alpha) {
      const r = Math.max(3, Math.round(size * 0.22));
      context.globalAlpha = alpha;
      context.fillStyle = color;
      roundRectPath(context, px + 2, py + 2, size - 4, size - 4, r);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.35)';
      roundRectPath(context, px + 5, py + 4, size - 10, Math.max(3, size * 0.2), r / 2);
      context.fill();
      context.globalAlpha = 1;
    },
  },
  pixel: {
    label: 'Pixel art',
    colors: [null, '#29adff', '#ffec27', '#a25ce0', '#00e436', '#ff004d', '#3d6bd6', '#ffa300'],
    grid: GRID_COLOR,
    drawBlock(context, px, py, size, color, alpha) {
      const edge = Math.max(2, Math.round(size / 10));
      const cell = Math.floor(size / 4);
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(px, py, size, size);
      // 4x4 checker / dither texture
      context.fillStyle = 'rgba(0,0,0,0.15)';
      for (let yy = 0; yy < 4; yy++)
        for (let xx = 0; xx < 4; xx++)
          if ((xx + yy) % 2 === 0)
            context.fillRect(px + xx * cell, py + yy * cell, cell, cell);
      // light top/left, dark bottom/right edge
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.fillRect(px, py, size - edge, edge);
      context.fillRect(px, py, edge, size - edge);
      context.fillStyle = 'rgba(0,0,0,0.4)';
      context.fillRect(px, py + size - edge, size, edge);
      context.fillRect(px + size - edge, py, edge, size);
      context.globalAlpha = 1;
    },
  },
};
const RECORDS_STORAGE_KEY = 'tetris-records';
const LAST_NAME_STORAGE_KEY = 'tetris-last-name';
const MAX_RECORDS = 5;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');
const pauseMenu = document.getElementById('pause-menu');
const pauseResumeBtn = document.getElementById('pause-resume');
const pauseRestartBtn = document.getElementById('pause-restart');
const pauseControlsBtn = document.getElementById('pause-controls-btn');
const pauseControls = document.getElementById('pause-controls');
const startLevelSelect = document.getElementById('start-level');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let theme = 'dark';
let currentSkin = SKINS[DEFAULT_SKIN];
let startLevel = 1;    // chosen in the pause menu, applied on the next init()
let gameStartLevel = 1; // level the current game started at

function intervalForLevel(l) {
  return Math.max(100, 1000 - (l - 1) * 90);
}
const startScreen = document.getElementById('start-screen');
const startTable = document.getElementById('start-table');
const startStats = document.getElementById('start-stats');
const playBtn = document.getElementById('play-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const resetConfirm = document.getElementById('reset-confirm');
const resetYesBtn = document.getElementById('reset-yes-btn');
const resetNoBtn = document.getElementById('reset-no-btn');
const gameoverRecords = document.getElementById('gameover-records');
const newRecordMsg = document.getElementById('new-record-msg');
const recordForm = document.getElementById('record-form');
const recordNameInput = document.getElementById('record-name');
const gameoverTable = document.getElementById('gameover-table');
const gameoverStats = document.getElementById('gameover-stats');

let combo = 0, maxCombo = 0;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  combo = cleared ? combo + 1 : 0;
  maxCombo = Math.max(maxCombo, combo);
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.max(gameStartLevel, Math.floor(lines / 10) + 1);
    dropInterval = intervalForLevel(level);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = currentSkin.colors[colorIndex];
  currentSkin.drawBlock(context, x * size, y * size, size, color, alpha ?? 1);
}

function clearCanvas(context, cvs) {
  context.clearRect(0, 0, cvs.width, cvs.height);
  if (currentSkin.boardBg) {
    context.fillStyle = currentSkin.boardBg;
    context.fillRect(0, 0, cvs.width, cvs.height);
  }
}

function drawGrid() {
  ctx.strokeStyle = currentSkin.grid[theme];
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  clearCanvas(ctx, canvas);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  clearCanvas(nextCtx, nextCanvas);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
  showGameOverRecords();
}

function applyTheme(t) {
  theme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_STORAGE_KEY, t);
  themeToggle.checked = t === 'light';
  if (current) draw();
}

function loadSkin() {
  try {
    const stored = localStorage.getItem(SKIN_STORAGE_KEY);
    if (Object.prototype.hasOwnProperty.call(SKINS, stored)) return stored;
  } catch (e) { /* storage unavailable */ }
  return DEFAULT_SKIN;
}

function applySkin(name) {
  if (!Object.prototype.hasOwnProperty.call(SKINS, name)) name = DEFAULT_SKIN;
  currentSkin = SKINS[name];
  document.documentElement.setAttribute('data-skin', name);
  skinSelect.value = name;
  try { localStorage.setItem(SKIN_STORAGE_KEY, name); } catch (e) { /* ignore */ }
  if (current) {
    draw();
    drawNext();
  }
}

function isPauseMenuOpen() {
  return !pauseMenu.classList.contains('hidden');
}

function setControlsVisible(visible) {
  pauseControls.classList.toggle('hidden', !visible);
  pauseControlsBtn.setAttribute('aria-expanded', String(visible));
}

function hidePauseMenu() {
  pauseMenu.classList.add('hidden');
  if (pauseMenu.contains(document.activeElement)) document.activeElement.blur();
}

function openPauseMenu() {
  if (gameOver) return;
  paused = true;
  cancelAnimationFrame(animId);
  setControlsVisible(false);
  startLevelSelect.value = String(startLevel);
  pauseMenu.classList.remove('hidden');
  pauseResumeBtn.focus();
}

// Resume on the next frame so the key/click that closed the menu can't leak into the game.
function resumeGame() {
  if (gameOver || !paused) return;
  hidePauseMenu();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(ts => {
    paused = false;
    lastTime = ts;
    animId = requestAnimationFrame(loop);
  });
}

function togglePause() {
  if (gameOver) return;
  if (isPauseMenuOpen()) resumeGame();
  else openPauseMenu();
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  gameStartLevel = startLevel;
  level = gameStartLevel;
  combo = 0;
  maxCombo = 0;
  hideGameOverRecords();
  paused = false;
  gameOver = false;
  dropInterval = intervalForLevel(level);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  hidePauseMenu();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

// ---- Records (Top 5 en localStorage) ----
function emptyRecords() {
  return { scores: [], bestCombo: 0, maxLines: 0 };
}

function loadRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORDS_STORAGE_KEY));
    if (!data || typeof data !== 'object') return emptyRecords();
    const scores = Array.isArray(data.scores)
      ? data.scores
        .filter(r => r && typeof r.score === 'number' && Number.isFinite(r.score))
        .map(r => ({
          name: String(r.name ?? '').slice(0, 12),
          score: r.score,
          lines: Number(r.lines) || 0,
          level: Number(r.level) || 1,
          date: String(r.date ?? ''),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RECORDS)
      : [];
    return {
      scores,
      bestCombo: Number(data.bestCombo) || 0,
      maxLines: Number(data.maxLines) || 0,
    };
  } catch {
    return emptyRecords();
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // almacenamiento no disponible: los records no se guardan
  }
}

function loadLastName() {
  try {
    return localStorage.getItem(LAST_NAME_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveLastName(name) {
  try {
    localStorage.setItem(LAST_NAME_STORAGE_KEY, name);
  } catch {
    // ignorar
  }
}

// Posicion (0-based) que ocuparia la puntuacion en el Top, o -1 si no entra.
function recordRank(records, s) {
  if (s <= 0) return -1;
  const idx = records.scores.findIndex(r => s > r.score);
  if (idx !== -1) return idx;
  return records.scores.length < MAX_RECORDS ? records.scores.length : -1;
}

function renderRecordsTable(container, records, highlightIndex = -1) {
  container.textContent = '';
  if (!records.scores.length) {
    const p = document.createElement('p');
    p.className = 'records-empty';
    p.textContent = 'Sin records todavía';
    container.appendChild(p);
    return;
  }
  const table = document.createElement('table');
  table.className = 'records-table';
  const head = table.createTHead().insertRow();
  for (const h of ['#', 'NOMBRE', 'PUNTOS', 'LÍNEAS', 'NIVEL']) {
    const th = document.createElement('th');
    th.textContent = h;
    head.appendChild(th);
  }
  const body = table.createTBody();
  records.scores.forEach((r, i) => {
    const row = body.insertRow();
    if (i === highlightIndex) row.className = 'highlight';
    const date = new Date(r.date);
    if (!Number.isNaN(date.getTime())) row.title = date.toLocaleDateString('es');
    const cells = [
      [String(i + 1), 'num'],
      [r.name || 'Anónimo', 'name'],
      [r.score.toLocaleString(), 'num'],
      [String(r.lines), 'num'],
      [String(r.level), 'num'],
    ];
    for (const [text, cls] of cells) {
      const td = row.insertCell();
      td.className = cls;
      td.textContent = text;
    }
  });
  container.appendChild(table);
}

function recordStatsText(records) {
  return `Mejor combo: ${records.bestCombo} · Máx. líneas: ${records.maxLines}`;
}

function showStartScreen() {
  const records = loadRecords();
  renderRecordsTable(startTable, records);
  startStats.textContent = recordStatsText(records);
  resetConfirm.classList.add('hidden');
  resetRecordsBtn.classList.remove('hidden');
  startScreen.classList.remove('hidden');
}

function startGame() {
  startScreen.classList.add('hidden');
  init();
}

function showGameOverRecords() {
  const records = loadRecords();
  records.bestCombo = Math.max(records.bestCombo, maxCombo);
  records.maxLines = Math.max(records.maxLines, lines);
  saveRecords(records);

  const rank = recordRank(records, score);
  newRecordMsg.classList.toggle('hidden', rank === -1);
  recordForm.classList.toggle('hidden', rank === -1);
  if (rank !== -1) {
    newRecordMsg.textContent = `¡Nuevo record! Puesto #${rank + 1} del Top ${MAX_RECORDS}`;
    recordNameInput.value = loadLastName();
  }
  renderRecordsTable(gameoverTable, records);
  gameoverStats.textContent =
    `Esta partida: combo ${maxCombo} · ${lines} líneas — ${recordStatsText(records)}`;
  gameoverRecords.classList.remove('hidden');
}

function hideGameOverRecords() {
  gameoverRecords.classList.add('hidden');
  recordForm.classList.add('hidden');
  newRecordMsg.classList.add('hidden');
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
}

function saveCurrentRecord() {
  const records = loadRecords();
  const rank = recordRank(records, score);
  if (rank === -1) return;
  const name = recordNameInput.value.trim().slice(0, 12) || 'Anónimo';
  saveLastName(name);
  records.scores.splice(rank, 0, {
    name,
    score,
    lines,
    level,
    date: new Date().toISOString(),
  });
  records.scores = records.scores.slice(0, MAX_RECORDS);
  saveRecords(records);
  recordForm.classList.add('hidden');
  recordNameInput.blur();
  newRecordMsg.textContent = `¡Guardado en el puesto #${rank + 1}!`;
  renderRecordsTable(gameoverTable, records, rank);
}

function isTextInput(el) {
  return el instanceof HTMLInputElement && el.type === 'text';
}

document.addEventListener('keydown', e => {
  if (!current || isTextInput(e.target)) return;
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    if (!e.repeat) togglePause();
    return;
  }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

for (let l = 1; l <= 10; l++) startLevelSelect.add(new Option(String(l), String(l)));
startLevelSelect.addEventListener('change', () => {
  startLevel = Number(startLevelSelect.value);
});
pauseResumeBtn.addEventListener('click', resumeGame);
pauseRestartBtn.addEventListener('click', init);
pauseControlsBtn.addEventListener('click', () => {
  setControlsVisible(pauseControls.classList.contains('hidden'));
});

playBtn.addEventListener('click', startGame);

recordForm.addEventListener('submit', e => {
  e.preventDefault();
  saveCurrentRecord();
});

resetRecordsBtn.addEventListener('click', () => {
  resetRecordsBtn.classList.add('hidden');
  resetConfirm.classList.remove('hidden');
});

resetNoBtn.addEventListener('click', () => {
  resetConfirm.classList.add('hidden');
  resetRecordsBtn.classList.remove('hidden');
});

resetYesBtn.addEventListener('click', () => {
  try {
    localStorage.removeItem(RECORDS_STORAGE_KEY);
  } catch {
    // ignorar
  }
  showStartScreen();
});

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'light' : 'dark');
});

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  skinSelect.blur();
});

applySkin(loadSkin());
applyTheme(localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark');
showStartScreen();
