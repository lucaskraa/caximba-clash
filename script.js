import {
  CARDS,
  CARD_RARITIES,
  TOKEN_BLUEPRINTS,
  DEFAULT_DECKS,
  TARGET_TYPES,
  getCard,
  getDeckCards,
  calculateDeckMetrics,
  validateDeck,
  randomDeck,
  sortCards
} from './data.js';

const STORAGE_KEYS = {
  settings: 'caximbaClash.settings.v1',
  decks: 'caximbaClash.decks.v1',
  stats: 'caximbaClash.stats.v1',
  names: 'caximbaClash.names.v1'
};

const DEFAULT_SETTINGS = {
  sound: true,
  voice: true,
  particles: true,
  vibration: true,
  quality: 'high',
  volume: 0.7
};

const DEFAULT_STATS = {
  totalMatches: 0,
  totalTowers: 0,
  totalDeployments: 0,
  totalDamage: 0,
  playerWins: {
    1: 0,
    2: 0
  },
  draws: 0,
  history: []
};

const PLAYER_COLORS = {
  1: {
    main: '#2f8cff',
    light: '#8ac8ff',
    dark: '#164da9',
    glow: 'rgba(47, 140, 255, 0.55)'
  },
  2: {
    main: '#ff4f67',
    light: '#ff9baa',
    dark: '#a91f3b',
    glow: 'rgba(255, 79, 103, 0.55)'
  }
};

const CARD_KEYS = {
  1: ['Q', 'W', 'E', 'R'],
  2: ['7', '8', '9', '0']
};

const ARENA = {
  width: 900,
  height: 1500,
  riverTop: 692,
  riverBottom: 808,
  bridgeWidth: 132,
  laneX: {
    left: 286,
    right: 614
  },
  spawnY: {
    1: 1115,
    2: 385
  },
  centerX: 450,
  centerY: 750
};

const QUALITY_PARTICLE_MULTIPLIER = {
  high: 1,
  medium: 0.62,
  low: 0.28
};

const towerDefinitions = [
  {
    id: 'p2-left',
    playerId: 2,
    kind: 'princess',
    lane: 'left',
    x: 285,
    y: 265,
    radius: 60,
    maxHp: 2700,
    damage: 102,
    range: 310,
    attackSpeed: 0.92
  },
  {
    id: 'p2-right',
    playerId: 2,
    kind: 'princess',
    lane: 'right',
    x: 615,
    y: 265,
    radius: 60,
    maxHp: 2700,
    damage: 102,
    range: 310,
    attackSpeed: 0.92
  },
  {
    id: 'p2-king',
    playerId: 2,
    kind: 'king',
    lane: 'center',
    x: 450,
    y: 110,
    radius: 76,
    maxHp: 4300,
    damage: 138,
    range: 340,
    attackSpeed: 0.82
  },
  {
    id: 'p1-left',
    playerId: 1,
    kind: 'princess',
    lane: 'left',
    x: 285,
    y: 1235,
    radius: 60,
    maxHp: 2700,
    damage: 102,
    range: 310,
    attackSpeed: 0.92
  },
  {
    id: 'p1-right',
    playerId: 1,
    kind: 'princess',
    lane: 'right',
    x: 615,
    y: 1235,
    radius: 60,
    maxHp: 2700,
    damage: 102,
    range: 310,
    attackSpeed: 0.92
  },
  {
    id: 'p1-king',
    playerId: 1,
    kind: 'king',
    lane: 'center',
    x: 450,
    y: 1390,
    radius: 76,
    maxHp: 4300,
    damage: 138,
    range: 340,
    attackSpeed: 0.82
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function inverseLerp(start, end, value) {
  if (start === end) {
    return 0;
  }
  return clamp((value - start) / (end - start), 0, 1);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

function chance(probability) {
  return Math.random() < probability;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(value)));
}

function formatDecimal(value, digits = 1) {
  return Number(value || 0).toFixed(digits).replace('.', ',');
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function formatDate(timestamp) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function uid(prefix = 'id') {
  uid.counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uid.counter.toString(36)}`;
}
uid.counter = 0;

function loadStorage(key, fallback) {
  const stored = localStorage.getItem(key);
  if (!stored) {
    return deepClone(fallback);
  }
  const parsed = safeJsonParse(stored, null);
  if (parsed === null) {
    return deepClone(fallback);
  }
  return parsed;
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function getRarityClass(rarity) {
  if (rarity === 'Épica') {
    return 'epic';
  }
  if (rarity === 'Rara') {
    return 'rare';
  }
  return 'common';
}

function getTargetLabel(target) {
  if (target === TARGET_TYPES.BUILDINGS) {
    return 'Torres';
  }
  if (target === TARGET_TYPES.ALL) {
    return 'Todos';
  }
  return 'Terrestre';
}

function secondsNow() {
  return performance.now() / 1000;
}

const dom = {};

const appState = {
  currentScreen: 'splashScreen',
  previousScreen: 'menuScreen',
  deckEditingPlayer: 1,
  deckEditingReturn: 'setupScreen',
  deckDraft: [],
  settings: {
    ...DEFAULT_SETTINGS,
    ...loadStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  },
  stats: {
    ...deepClone(DEFAULT_STATS),
    ...loadStorage(STORAGE_KEYS.stats, DEFAULT_STATS)
  },
  names: {
    1: 'Jogador 1',
    2: 'Jogador 2',
    ...loadStorage(STORAGE_KEYS.names, {})
  },
  decks: {
    1: [...DEFAULT_DECKS[1]],
    2: [...DEFAULT_DECKS[2]],
    ...loadStorage(STORAGE_KEYS.decks, {})
  },
  images: new Map(),
  imageErrors: new Set(),
  initialized: false,
  splashDone: false,
  soundEnabled: true
};

if (!validateDeck(appState.decks[1])) {
  appState.decks[1] = [...DEFAULT_DECKS[1]];
}

if (!validateDeck(appState.decks[2])) {
  appState.decks[2] = [...DEFAULT_DECKS[2]];
}

class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.unlocked = false;
    this.lastSoundAt = new Map();
  }

  ensureContext() {
    if (!appState.settings.sound) {
      return null;
    }
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = clamp(appState.settings.volume, 0, 1);
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
    this.unlocked = true;
    return this.context;
  }

  updateVolume() {
    if (!this.master) {
      return;
    }
    const value = appState.settings.sound ? clamp(appState.settings.volume, 0, 1) : 0;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.02);
  }

  canPlay(name, cooldown = 0) {
    if (!appState.settings.sound) {
      return false;
    }
    const now = performance.now();
    const previous = this.lastSoundAt.get(name) || 0;
    if (now - previous < cooldown * 1000) {
      return false;
    }
    this.lastSoundAt.set(name, now);
    return true;
  }

  tone({
    frequency = 440,
    duration = 0.12,
    type = 'sine',
    volume = 0.12,
    slideTo = null,
    delay = 0,
    attack = 0.006,
    release = 0.08
  } = {}) {
    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }
    const start = context.currentTime + delay;
    const end = start + duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (slideTo !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), end);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + attack);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), Math.max(start + attack, end - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(end + 0.03);
  }

  noise({
    duration = 0.16,
    volume = 0.1,
    filterFrequency = 900,
    delay = 0
  } = {}) {
    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }
    const sampleRate = context.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      const fade = 1 - index / frameCount;
      channel[index] = (Math.random() * 2 - 1) * fade;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
  }

  click() {
    if (!this.canPlay('click', 0.035)) {
      return;
    }
    this.tone({
      frequency: 440,
      slideTo: 610,
      duration: 0.07,
      type: 'triangle',
      volume: 0.07
    });
  }

  select(playerId = 1) {
    if (!this.canPlay(`select-${playerId}`, 0.05)) {
      return;
    }
    this.tone({
      frequency: playerId === 1 ? 520 : 390,
      slideTo: playerId === 1 ? 700 : 520,
      duration: 0.09,
      type: 'sine',
      volume: 0.08
    });
  }

  deploy(playerId = 1) {
    if (!this.canPlay(`deploy-${playerId}`, 0.05)) {
      return;
    }
    this.tone({
      frequency: playerId === 1 ? 240 : 210,
      slideTo: playerId === 1 ? 520 : 430,
      duration: 0.16,
      type: 'sawtooth',
      volume: 0.08
    });
    this.tone({
      frequency: playerId === 1 ? 620 : 520,
      duration: 0.08,
      delay: 0.08,
      type: 'triangle',
      volume: 0.06
    });
  }

  hit(heavy = false) {
    const key = heavy ? 'hit-heavy' : 'hit-light';
    if (!this.canPlay(key, heavy ? 0.08 : 0.035)) {
      return;
    }
    this.noise({
      duration: heavy ? 0.18 : 0.08,
      volume: heavy ? 0.12 : 0.055,
      filterFrequency: heavy ? 520 : 1150
    });
    this.tone({
      frequency: heavy ? 95 : 160,
      slideTo: heavy ? 55 : 105,
      duration: heavy ? 0.18 : 0.08,
      type: 'square',
      volume: heavy ? 0.09 : 0.035
    });
  }

  explosion() {
    if (!this.canPlay('explosion', 0.12)) {
      return;
    }
    this.noise({
      duration: 0.42,
      volume: 0.18,
      filterFrequency: 650
    });
    this.tone({
      frequency: 105,
      slideTo: 34,
      duration: 0.38,
      type: 'sawtooth',
      volume: 0.13
    });
  }

  towerHit() {
    if (!this.canPlay('tower-hit', 0.08)) {
      return;
    }
    this.noise({
      duration: 0.13,
      volume: 0.09,
      filterFrequency: 480
    });
    this.tone({
      frequency: 120,
      slideTo: 72,
      duration: 0.16,
      type: 'square',
      volume: 0.07
    });
  }

  towerDown() {
    if (!this.canPlay('tower-down', 0.5)) {
      return;
    }
    this.noise({
      duration: 0.7,
      volume: 0.2,
      filterFrequency: 720
    });
    [180, 150, 120, 82].forEach((frequency, index) => {
      this.tone({
        frequency,
        slideTo: frequency * 0.56,
        duration: 0.38,
        delay: index * 0.07,
        type: 'sawtooth',
        volume: 0.09
      });
    });
  }

  error() {
    if (!this.canPlay('error', 0.18)) {
      return;
    }
    this.tone({
      frequency: 190,
      slideTo: 130,
      duration: 0.18,
      type: 'square',
      volume: 0.065
    });
  }

  victory() {
    if (!this.canPlay('victory', 1)) {
      return;
    }
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: 0.28,
        delay: index * 0.12,
        type: 'triangle',
        volume: 0.09
      });
    });
  }

  countdown(value) {
    if (!this.canPlay(`count-${value}`, 0.2)) {
      return;
    }
    this.tone({
      frequency: value === 0 ? 720 : 420 + value * 30,
      slideTo: value === 0 ? 980 : 460 + value * 30,
      duration: value === 0 ? 0.24 : 0.12,
      type: 'triangle',
      volume: value === 0 ? 0.12 : 0.08
    });
  }
}

const audio = new AudioManager();

function vibrate(pattern) {
  if (!appState.settings.vibration) {
    return;
  }
  if (typeof navigator.vibrate !== 'function') {
    return;
  }
  navigator.vibrate(pattern);
}

function speak(text, priority = false) {
  if (!appState.settings.voice) {
    return;
  }
  if (!('speechSynthesis' in window)) {
    return;
  }
  if (priority) {
    window.speechSynthesis.cancel();
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.06;
  utterance.pitch = 0.92;
  utterance.volume = clamp(appState.settings.volume + 0.1, 0, 1);
  window.speechSynthesis.speak(utterance);
}

function cacheDom() {
  const ids = [
    'app',
    'toastHost',
    'splashScreen',
    'loadingBar',
    'loadingText',
    'menuScreen',
    'soundToggle',
    'menuPlayerLabel',
    'menuStatsLabel',
    'settingsShortcut',
    'quickBattleButton',
    'deckButton',
    'collectionButton',
    'tutorialButton',
    'statsButton',
    'setupScreen',
    'playerOneName',
    'playerOneDeckSummary',
    'playerTwoName',
    'playerTwoDeckSummary',
    'matchDuration',
    'initialElixir',
    'chaosMode',
    'openHands',
    'startBattleButton',
    'deckScreen',
    'deckBackButton',
    'deckScreenTitle',
    'deckCount',
    'selectedDeck',
    'averageCost',
    'totalHealth',
    'averageDamage',
    'randomDeckButton',
    'saveDeckButton',
    'deckSearch',
    'deckFilter',
    'deckSort',
    'deckCardGrid',
    'collectionScreen',
    'collectionGrid',
    'tutorialScreen',
    'statsScreen',
    'clearStatsButton',
    'statsOverview',
    'historyList',
    'settingsScreen',
    'settingsSound',
    'settingsVoice',
    'settingsParticles',
    'settingsVibration',
    'settingsQuality',
    'settingsVolume',
    'saveSettingsButton',
    'battleScreen',
    'battleBackdrop',
    'battleNameTwo',
    'battleCrownsTwo',
    'battleTimer',
    'battlePhase',
    'battleNameOne',
    'battleCrownsOne',
    'pauseButton',
    'playerTwoPanel',
    'elixirBarTwo',
    'elixirValueTwo',
    'handTwo',
    'laneLabelTwo',
    'deployTwoButton',
    'gameCanvas',
    'arenaAnnouncement',
    'chaosBanner',
    'playerOnePanel',
    'elixirBarOne',
    'elixirValueOne',
    'handOne',
    'laneLabelOne',
    'deployOneButton',
    'pauseModal',
    'resumeButton',
    'restartButton',
    'quitBattleButton',
    'resultModal',
    'resultCrown',
    'resultKicker',
    'resultTitle',
    'resultSubtitle',
    'resultScore',
    'resultHighlights',
    'rematchButton',
    'resultMenuButton',
    'cardModal',
    'cardDetailContent'
  ];
  ids.forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

function toast(title, message = '', type = 'info', duration = 3200) {
  if (!dom.toastHost) {
    return;
  }
  const icons = {
    info: 'ℹ',
    success: '✓',
    warning: '!',
    error: '×'
  };
  const element = document.createElement('div');
  element.className = `toast toast--${type}`;
  element.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__text">
      <strong>${escapeHtml(title)}</strong>
      ${message ? `<span>${escapeHtml(message)}</span>` : ''}
    </span>
    <button class="toast__close" aria-label="Fechar">×</button>
  `;
  const close = () => {
    if (element.classList.contains('toast--leaving')) {
      return;
    }
    element.classList.add('toast--leaving');
    window.setTimeout(() => element.remove(), 280);
  };
  element.querySelector('.toast__close').addEventListener('click', close);
  dom.toastHost.appendChild(element);
  window.setTimeout(close, duration);
}

function openModal(element) {
  if (!element) {
    return;
  }
  element.classList.add('modal--open');
  element.setAttribute('aria-hidden', 'false');
}

function closeModal(element) {
  if (!element) {
    return;
  }
  element.classList.remove('modal--open');
  element.setAttribute('aria-hidden', 'true');
}

function showScreen(screenId, options = {}) {
  const target = document.getElementById(screenId);
  if (!target) {
    return;
  }
  if (appState.currentScreen === screenId && !options.force) {
    return;
  }
  const current = document.getElementById(appState.currentScreen);
  if (current) {
    current.classList.remove('screen--active');
    current.classList.remove('screen--leaving');
  }
  document.querySelectorAll('.screen').forEach((screen) => {
    if (screen !== target) {
      screen.classList.remove('screen--active');
      screen.classList.remove('screen--leaving');
    }
  });
  appState.previousScreen = appState.currentScreen;
  appState.currentScreen = screenId;
  target.classList.add('screen--active');
  target.scrollTop = 0;
  audio.click();
  if (screenId === 'menuScreen') {
    updateMenuStats();
  }
  if (screenId === 'setupScreen') {
    renderSetup();
  }
  if (screenId === 'collectionScreen') {
    renderCollection();
  }
  if (screenId === 'statsScreen') {
    renderStats();
  }
  if (screenId === 'settingsScreen') {
    renderSettings();
  }
}

function updateMenuStats() {
  const wins = Number(appState.stats.playerWins?.[1] || 0) + Number(appState.stats.playerWins?.[2] || 0);
  dom.menuPlayerLabel.textContent = 'Duelo Local CPX';
  dom.menuStatsLabel.textContent = `${wins} vitória${wins === 1 ? '' : 's'} registrada${wins === 1 ? '' : 's'} · ${appState.stats.totalMatches || 0} partidas`;
  dom.soundToggle.textContent = appState.settings.sound ? '🔊' : '🔇';
  dom.soundToggle.setAttribute('aria-label', appState.settings.sound ? 'Desativar som' : 'Ativar som');
}

function renderDeckSummary(container, deckIds) {
  const cards = getDeckCards(deckIds);
  container.innerHTML = cards.map((card) => `
    <div class="deck-summary__item" title="${escapeHtml(card.name)}">
      <img src="${card.portrait}" alt="${escapeHtml(card.name)}">
      <span>${card.cost}</span>
    </div>
  `).join('');
}

function renderSetup() {
  dom.playerOneName.value = appState.names[1] || 'Jogador 1';
  dom.playerTwoName.value = appState.names[2] || 'Jogador 2';
  renderDeckSummary(dom.playerOneDeckSummary, appState.decks[1]);
  renderDeckSummary(dom.playerTwoDeckSummary, appState.decks[2]);
}

function saveNames() {
  appState.names[1] = dom.playerOneName.value.trim().slice(0, 16) || 'Jogador 1';
  appState.names[2] = dom.playerTwoName.value.trim().slice(0, 16) || 'Jogador 2';
  dom.playerOneName.value = appState.names[1];
  dom.playerTwoName.value = appState.names[2];
  saveStorage(STORAGE_KEYS.names, appState.names);
}

function buildCardElement(card, options = {}) {
  const button = document.createElement('button');
  const selected = Boolean(options.selected);
  const disabled = Boolean(options.disabled);
  button.type = 'button';
  button.className = [
    'game-card',
    selected ? 'game-card--selected' : '',
    disabled ? 'game-card--disabled' : ''
  ].filter(Boolean).join(' ');
  button.dataset.cardId = card.id;
  button.disabled = disabled;
  button.style.setProperty('--rarity-color', CARD_RARITIES[card.rarity]?.color || '#fff');
  button.innerHTML = `
    <div class="game-card__image">
      <img src="${card.image}" alt="${escapeHtml(card.name)}" loading="lazy">
      <span class="game-card__cost">${card.cost}</span>
      <span class="game-card__rarity rarity--${getRarityClass(card.rarity)}">${escapeHtml(card.rarity)}</span>
    </div>
    <div class="game-card__body">
      <strong>${escapeHtml(card.name)}</strong>
      <small>${escapeHtml(card.role)}</small>
      <div class="game-card__stats">
        <span>❤ ${formatNumber(card.hp)}</span>
        <span>✹ ${formatNumber(card.damage)}</span>
      </div>
    </div>
  `;
  return button;
}

function openCardDetail(cardId) {
  const card = getCard(cardId);
  if (!card) {
    return;
  }
  dom.cardDetailContent.innerHTML = `
    <article class="card-detail">
      <div class="card-detail__image">
        <img src="${card.image}" alt="${escapeHtml(card.name)}">
      </div>
      <div class="card-detail__content">
        <header class="card-detail__heading">
          <span class="rarity rarity--${getRarityClass(card.rarity)}">${escapeHtml(card.rarity)} · ${card.cost} de energia</span>
          <h2>${escapeHtml(card.name)}</h2>
          <span class="card-detail__role">${escapeHtml(card.role)}</span>
        </header>
        <div class="card-detail__stats">
          <div class="card-detail__stat"><span>Vida</span><strong>${formatNumber(card.hp)}</strong></div>
          <div class="card-detail__stat"><span>Dano</span><strong>${formatNumber(card.damage)}</strong></div>
          <div class="card-detail__stat"><span>Velocidade</span><strong>${escapeHtml(card.speedLabel)}</strong></div>
          <div class="card-detail__stat"><span>Alvo</span><strong>${getTargetLabel(card.target)}</strong></div>
        </div>
        <section class="card-detail__section">
          <h3>Função</h3>
          <p>${escapeHtml(card.description)}</p>
        </section>
        <section class="card-detail__section">
          <h3>Habilidade</h3>
          <p>${escapeHtml(card.ability)}</p>
        </section>
        <section class="card-detail__section">
          <h3>Como usar</h3>
          <p>${escapeHtml(card.balanceNote)}</p>
        </section>
        <blockquote class="card-detail__quote">“${escapeHtml(card.quote)}”</blockquote>
      </div>
    </article>
  `;
  openModal(dom.cardModal);
  audio.select(1);
}

function renderCollection() {
  dom.collectionGrid.innerHTML = '';
  sortCards(CARDS, 'rarity').forEach((card) => {
    const element = buildCardElement(card);
    element.addEventListener('click', () => openCardDetail(card.id));
    dom.collectionGrid.appendChild(element);
  });
}

function openDeckEditor(playerId, returnScreen = 'setupScreen') {
  appState.deckEditingPlayer = Number(playerId) === 2 ? 2 : 1;
  appState.deckEditingReturn = returnScreen;
  appState.deckDraft = [...appState.decks[appState.deckEditingPlayer]];
  dom.deckScreenTitle.textContent = `Deck do Jogador ${appState.deckEditingPlayer}`;
  dom.deckSearch.value = '';
  dom.deckFilter.value = 'all';
  dom.deckSort.value = 'cost';
  renderDeckEditor();
  showScreen('deckScreen');
}

function renderSelectedDeck() {
  dom.selectedDeck.innerHTML = '';
  for (let index = 0; index < 8; index += 1) {
    const cardId = appState.deckDraft[index];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `selected-deck__slot${cardId ? ' selected-deck__slot--filled' : ''}`;
    slot.dataset.index = String(index + 1);
    if (cardId) {
      const card = getCard(cardId);
      slot.title = `Remover ${card.name}`;
      slot.innerHTML = `<img src="${card.portrait}" alt="${escapeHtml(card.name)}">`;
      slot.addEventListener('click', () => {
        appState.deckDraft.splice(index, 1);
        audio.select(appState.deckEditingPlayer);
        renderDeckEditor();
      });
    } else {
      slot.title = 'Espaço vazio';
    }
    dom.selectedDeck.appendChild(slot);
  }
  dom.deckCount.textContent = String(appState.deckDraft.length);
  const metrics = calculateDeckMetrics(appState.deckDraft);
  dom.averageCost.textContent = formatDecimal(metrics.averageCost, 1);
  dom.totalHealth.textContent = formatNumber(metrics.totalHealth);
  dom.averageDamage.textContent = formatNumber(metrics.averageDamage);
  dom.saveDeckButton.disabled = appState.deckDraft.length !== 8;
}

function renderDeckCards() {
  const query = normalizeText(dom.deckSearch.value);
  const rarity = dom.deckFilter.value;
  const sortMode = dom.deckSort.value;
  let cards = CARDS.filter((card) => {
    const matchesQuery = !query || normalizeText(`${card.name} ${card.role} ${card.description}`).includes(query);
    const matchesRarity = rarity === 'all' || card.rarity === rarity;
    return matchesQuery && matchesRarity;
  });
  cards = sortCards(cards, sortMode);
  dom.deckCardGrid.innerHTML = '';
  cards.forEach((card) => {
    const selected = appState.deckDraft.includes(card.id);
    const disabled = !selected && appState.deckDraft.length >= 8;
    const element = buildCardElement(card, {
      selected,
      disabled
    });
    element.addEventListener('click', () => {
      const selectedIndex = appState.deckDraft.indexOf(card.id);
      if (selectedIndex >= 0) {
        appState.deckDraft.splice(selectedIndex, 1);
      } else if (appState.deckDraft.length < 8) {
        appState.deckDraft.push(card.id);
      }
      audio.select(appState.deckEditingPlayer);
      renderDeckEditor();
    });
    dom.deckCardGrid.appendChild(element);
  });
  if (!cards.length) {
    dom.deckCardGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span>⌕</span>
        <strong>Nenhuma carta encontrada</strong>
        <p>Tente outro nome ou mude o filtro de raridade.</p>
      </div>
    `;
  }
}

function renderDeckEditor() {
  renderSelectedDeck();
  renderDeckCards();
}

function saveEditedDeck() {
  if (!validateDeck(appState.deckDraft)) {
    audio.error();
    toast('Deck incompleto', 'Escolha exatamente 8 cartas antes de salvar.', 'warning');
    return;
  }
  appState.decks[appState.deckEditingPlayer] = [...appState.deckDraft];
  saveStorage(STORAGE_KEYS.decks, appState.decks);
  audio.deploy(appState.deckEditingPlayer);
  toast('Deck salvo', `O deck do Jogador ${appState.deckEditingPlayer} está pronto.`, 'success');
  showScreen(appState.deckEditingReturn || 'setupScreen');
}

function renderStats() {
  const totalMatches = Number(appState.stats.totalMatches || 0);
  const winsOne = Number(appState.stats.playerWins?.[1] || 0);
  const winsTwo = Number(appState.stats.playerWins?.[2] || 0);
  const favoriteSide = winsOne === winsTwo ? 'Empate' : winsOne > winsTwo ? 'Jogador 1' : 'Jogador 2';
  dom.statsOverview.innerHTML = `
    <article class="stat-card" data-icon="⚔"><span>Partidas</span><strong>${totalMatches}</strong><small>Total disputado</small></article>
    <article class="stat-card" data-icon="♛"><span>Vitórias J1</span><strong>${winsOne}</strong><small>${totalMatches ? Math.round(winsOne / totalMatches * 100) : 0}% das partidas</small></article>
    <article class="stat-card" data-icon="♛"><span>Vitórias J2</span><strong>${winsTwo}</strong><small>${totalMatches ? Math.round(winsTwo / totalMatches * 100) : 0}% das partidas</small></article>
    <article class="stat-card" data-icon="🏰"><span>Torres destruídas</span><strong>${formatNumber(appState.stats.totalTowers || 0)}</strong><small>Melhor lado: ${favoriteSide}</small></article>
  `;
  const history = Array.isArray(appState.stats.history) ? appState.stats.history : [];
  if (!history.length) {
    dom.historyList.innerHTML = `
      <div class="empty-state">
        <span>🏆</span>
        <strong>Nenhuma batalha registrada</strong>
        <p>Jogue uma partida para o histórico do Complexo começar.</p>
      </div>
    `;
    return;
  }
  dom.historyList.innerHTML = history.slice(0, 30).map((entry) => {
    const isDraw = !entry.winnerId;
    const winnerText = isDraw ? 'Empate' : `Vitória J${entry.winnerId}`;
    return `
      <article class="history-item">
        <span class="history-item__result${isDraw ? ' history-item__result--draw' : ''}">${winnerText}</span>
        <div class="history-item__main">
          <strong>${escapeHtml(entry.playerOne)} × ${escapeHtml(entry.playerTwo)}</strong>
          <small>${formatDate(entry.timestamp)} · ${escapeHtml(entry.reason || 'Fim do tempo')}</small>
        </div>
        <span class="history-item__score">${entry.crownsOne ?? 0} × ${entry.crownsTwo ?? 0}</span>
      </article>
    `;
  }).join('');
}

function clearStats() {
  const accepted = window.confirm('Apagar todo o histórico e todas as estatísticas do Caximba Clash?');
  if (!accepted) {
    return;
  }
  appState.stats = deepClone(DEFAULT_STATS);
  saveStorage(STORAGE_KEYS.stats, appState.stats);
  renderStats();
  updateMenuStats();
  toast('Histórico limpo', 'As estatísticas foram zeradas.', 'success');
}

function renderSettings() {
  dom.settingsSound.checked = Boolean(appState.settings.sound);
  dom.settingsVoice.checked = Boolean(appState.settings.voice);
  dom.settingsParticles.checked = Boolean(appState.settings.particles);
  dom.settingsVibration.checked = Boolean(appState.settings.vibration);
  dom.settingsQuality.value = appState.settings.quality || 'high';
  dom.settingsVolume.value = String(clamp(Number(appState.settings.volume ?? 0.7), 0, 1));
}

function saveSettings() {
  appState.settings.sound = dom.settingsSound.checked;
  appState.settings.voice = dom.settingsVoice.checked;
  appState.settings.particles = dom.settingsParticles.checked;
  appState.settings.vibration = dom.settingsVibration.checked;
  appState.settings.quality = dom.settingsQuality.value;
  appState.settings.volume = clamp(Number(dom.settingsVolume.value), 0, 1);
  saveStorage(STORAGE_KEYS.settings, appState.settings);
  audio.updateVolume();
  updateMenuStats();
  audio.click();
  toast('Configurações salvas', 'As preferências já estão valendo.', 'success');
  showScreen('menuScreen');
}

async function preloadImages(onProgress = () => {}) {
  const paths = new Set();
  CARDS.forEach((card) => {
    paths.add(card.image);
    paths.add(card.portrait);
  });
  const list = [...paths];
  let loaded = 0;
  const promises = list.map((path) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      appState.images.set(path, image);
      loaded += 1;
      onProgress(loaded / list.length, path, true);
      resolve();
    };
    image.onerror = () => {
      appState.imageErrors.add(path);
      loaded += 1;
      onProgress(loaded / list.length, path, false);
      resolve();
    };
    image.src = path;
  }));
  await Promise.all(promises);
}

function getCachedImage(path) {
  return appState.images.get(path) || null;
}

class BattleGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.animationFrame = null;
    this.lastTimestamp = 0;
    this.timeScale = 1;
    this.elapsed = 0;
    this.remaining = 180;
    this.normalDuration = 180;
    this.overtime = false;
    this.overtimeRemaining = 60;
    this.doubleElixir = false;
    this.countdown = 3.4;
    this.matchStarted = false;
    this.config = null;
    this.players = {};
    this.units = [];
    this.towers = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.rings = [];
    this.effects = [];
    this.shake = 0;
    this.flash = 0;
    this.totalDamage = 0;
    this.totalDeployments = 0;
    this.chaosTimer = 18;
    this.chaosActive = null;
    this.chaosMessageTimer = 0;
    this.announcementTimer = 0;
    this.nextSecondTick = null;
    this.result = null;
    this.boundLoop = (timestamp) => this.loop(timestamp);
  }

  start(config) {
    this.stop();
    this.config = {
      duration: Number(config.duration) || 180,
      initialElixir: clamp(Number(config.initialElixir) || 5, 0, 10),
      chaosMode: Boolean(config.chaosMode),
      openHands: Boolean(config.openHands),
      playerNames: {
        1: String(config.playerNames?.[1] || 'Jogador 1'),
        2: String(config.playerNames?.[2] || 'Jogador 2')
      },
      decks: {
        1: [...config.decks[1]],
        2: [...config.decks[2]]
      }
    };
    this.running = true;
    this.paused = false;
    this.ended = false;
    this.lastTimestamp = performance.now();
    this.elapsed = 0;
    this.normalDuration = this.config.duration;
    this.remaining = this.normalDuration;
    this.overtime = false;
    this.overtimeRemaining = 60;
    this.doubleElixir = false;
    this.countdown = 3.4;
    this.matchStarted = false;
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.rings = [];
    this.effects = [];
    this.shake = 0;
    this.flash = 0;
    this.totalDamage = 0;
    this.totalDeployments = 0;
    this.chaosTimer = randomRange(16, 23);
    this.chaosActive = null;
    this.chaosMessageTimer = 0;
    this.announcementTimer = 0;
    this.nextSecondTick = null;
    this.result = null;
    this.setupPlayers();
    this.setupTowers();
    this.syncBattleHeader();
    this.renderHands();
    this.updateHandsAffordability();
    dom.battlePhase.textContent = 'Preparando';
    dom.battleTimer.textContent = formatTime(this.normalDuration);
    dom.arenaAnnouncement.textContent = '';
    dom.arenaAnnouncement.classList.remove('arena-announcement--show');
    dom.chaosBanner.classList.remove('chaos-banner--show');
    closeModal(dom.pauseModal);
    closeModal(dom.resultModal);
    this.draw();
    this.animationFrame = requestAnimationFrame(this.boundLoop);
  }

  stop() {
    this.running = false;
    this.paused = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  setupPlayers() {
    [1, 2].forEach((playerId) => {
      const deck = this.config.decks[playerId];
      const opening = deck.slice(0, 4);
      this.players[playerId] = {
        id: playerId,
        name: this.config.playerNames[playerId],
        deck: [...deck],
        hand: [...opening],
        queueIndex: 4,
        selectedIndex: 0,
        lane: 'left',
        elixir: this.config.initialElixir,
        maxElixir: 10,
        crowns: 0,
        destroyedTowers: [],
        deployments: 0,
        damage: 0,
        generatedElixir: 0,
        lastDeployAt: -99
      };
    });
  }

  setupTowers() {
    this.towers = towerDefinitions.map((definition) => ({
      ...definition,
      hp: definition.maxHp,
      alive: true,
      attackCooldown: randomRange(0.05, 0.35),
      targetId: null,
      hitFlash: 0,
      activation: definition.kind === 'king' ? 0 : 1,
      damageTaken: 0
    }));
  }

  syncBattleHeader() {
    dom.battleNameOne.textContent = this.players[1].name;
    dom.battleNameTwo.textContent = this.players[2].name;
    this.updateScoreLabels();
    this.updateLaneLabels();
  }

  loop(timestamp) {
    if (!this.running) {
      return;
    }
    let dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    dt = clamp(dt, 0, 0.05);
    if (!this.paused && !this.ended) {
      this.update(dt * this.timeScale);
    }
    this.draw();
    this.animationFrame = requestAnimationFrame(this.boundLoop);
  }

  update(dt) {
    if (!this.matchStarted) {
      this.updateCountdown(dt);
      this.updateParticles(dt);
      this.updateFloaters(dt);
      this.updateRings(dt);
      return;
    }
    this.elapsed += dt;
    if (!this.overtime) {
      this.remaining -= dt;
    } else {
      this.overtimeRemaining -= dt;
    }
    this.updateTimerState();
    this.updateElixir(dt);
    this.updateStatusEffects(dt);
    this.updateUnits(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateFloaters(dt);
    this.updateRings(dt);
    this.updateVisualTimers(dt);
    this.updateChaos(dt);
    this.resolveCollisions(dt);
    this.cleanupEntities();
    this.updateHandsAffordability();
    if (!this.overtime && this.remaining <= 0) {
      this.handleNormalTimeEnd();
    }
    if (this.overtime && this.overtimeRemaining <= 0) {
      this.finishByHealthComparison('Fim da morte súbita');
    }
  }

  updateCountdown(dt) {
    const previous = Math.ceil(this.countdown);
    this.countdown -= dt;
    const current = Math.ceil(this.countdown);
    if (current !== previous && current >= 0) {
      if (current > 0) {
        this.announce(String(current));
        audio.countdown(current);
      } else {
        this.announce('Batalha!');
        audio.countdown(0);
        speak('Batalha!', true);
      }
    }
    if (this.countdown <= 0) {
      this.matchStarted = true;
      dom.battlePhase.textContent = 'Tempo normal';
      this.spawnOpeningSparkles();
    }
  }

  updateTimerState() {
    const displayValue = this.overtime ? this.overtimeRemaining : this.remaining;
    dom.battleTimer.textContent = formatTime(displayValue);
    const second = Math.ceil(displayValue);
    if (second !== this.nextSecondTick) {
      this.nextSecondTick = second;
      if (second <= 10 && second > 0) {
        audio.countdown(second);
      }
    }
    if (!this.overtime && !this.doubleElixir && this.remaining <= 60) {
      this.doubleElixir = true;
      dom.battlePhase.textContent = 'Energia em dobro';
      this.announce('Energia em dobro!');
      speak('Energia em dobro!');
      this.addArenaRing(ARENA.centerX, ARENA.centerY, '#d657ff', 360, 1.2);
    }
    const clock = dom.battleTimer.closest('.battle-clock');
    if (displayValue <= 20) {
      clock.classList.add('battle-clock--urgent');
    } else {
      clock.classList.remove('battle-clock--urgent');
    }
  }

  updateElixir(dt) {
    let multiplier = this.doubleElixir ? 2 : 1;
    if (this.chaosActive?.type === 'turbo') {
      multiplier *= 1.75;
    }
    const baseRate = 1 / 2.8;
    [1, 2].forEach((playerId) => {
      const player = this.players[playerId];
      player.elixir = clamp(player.elixir + baseRate * multiplier * dt, 0, player.maxElixir);
      this.updateElixirDisplay(playerId);
    });
  }

  updateStatusEffects(dt) {
    this.effects.forEach((effect) => {
      effect.remaining -= dt;
      if (effect.type === 'globalSlow') {
        return;
      }
      const target = this.findDamageableById(effect.targetId);
      if (!target || !target.alive) {
        effect.remaining = 0;
        return;
      }
      if (effect.type === 'dot') {
        effect.tick -= dt;
        if (effect.tick <= 0) {
          effect.tick += effect.interval;
          this.dealDamage(target, effect.damage, {
            playerId: effect.sourcePlayerId,
            sourceId: effect.sourceId,
            kind: 'dot',
            color: '#f5f1de',
            silent: true
          });
        }
      }
    });
    this.effects = this.effects.filter((effect) => effect.remaining > 0);
  }

  updateUnits(dt) {
    this.units.forEach((unit) => {
      if (!unit.alive) {
        return;
      }
      unit.age += dt;
      unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
      unit.hitFlash = Math.max(0, unit.hitFlash - dt);
      unit.spawnScale = lerp(unit.spawnScale, 1, clamp(dt * 8, 0, 1));
      unit.rotation = lerp(unit.rotation, 0, clamp(dt * 7, 0, 1));
      if (unit.special === 'elixirGenerator') {
        unit.generatorTimer -= dt;
        if (unit.generatorTimer <= 0) {
          unit.generatorTimer += 4.25;
          const owner = this.players[unit.playerId];
          const amount = 0.7;
          owner.elixir = clamp(owner.elixir + amount, 0, owner.maxElixir);
          owner.generatedElixir += amount;
          this.addFloater(unit.x, unit.y - unit.radius, `+${formatDecimal(amount, 1)} ⚡`, '#df75ff', 0.85);
          this.addArenaRing(unit.x, unit.y, '#c64dff', 74, 0.55);
          audio.select(unit.playerId);
        }
      }
      this.updateUnitEnrage(unit);
      this.updateUnitTarget(unit);
      if (unit.targetId) {
        const target = this.findDamageableById(unit.targetId);
        if (!target || !target.alive) {
          unit.targetId = null;
          unit.state = 'moving';
          return;
        }
        const targetDistance = distance(unit, target);
        const reach = unit.range + target.radius;
        if (targetDistance <= reach) {
          unit.state = 'attacking';
          this.faceTarget(unit, target);
          if (unit.attackCooldown <= 0) {
            this.performUnitAttack(unit, target);
          }
        } else {
          unit.state = 'moving';
          this.moveUnitToward(unit, target.x, target.y, dt);
        }
      } else {
        unit.state = 'moving';
        this.followLanePath(unit, dt);
      }
      this.keepUnitInBounds(unit);
    });
  }

  updateUnitEnrage(unit) {
    if (unit.special !== 'energizedHoe') {
      return;
    }
    const shouldEnrage = unit.hp <= unit.maxHp * 0.5;
    if (shouldEnrage && !unit.enraged) {
      unit.enraged = true;
      unit.damageMultiplier *= 1.45;
      unit.attackSpeedMultiplier *= 1.3;
      unit.missChance = Math.max(unit.missChance, 0.15);
      this.addArenaRing(unit.x, unit.y, '#ffd348', 110, 0.8);
      this.addFloater(unit.x, unit.y - 30, 'ENERGIZADO!', '#ffe36c', 1.1);
      this.emitParticles(unit.x, unit.y, '#ffe36c', 20, 150, 0.75);
      audio.deploy(unit.playerId);
    }
  }

  updateUnitTarget(unit) {
    const current = this.findDamageableById(unit.targetId);
    if (current && current.alive) {
      const currentDistance = distance(unit, current);
      if (currentDistance <= unit.sight * 1.45 || current.type === 'tower') {
        return;
      }
    }
    let candidates = [];
    if (unit.target === TARGET_TYPES.BUILDINGS) {
      candidates = this.towers.filter((tower) => tower.alive && tower.playerId !== unit.playerId);
    } else {
      const enemyUnits = this.units.filter((other) => {
        if (!other.alive || other.playerId === unit.playerId) {
          return false;
        }
        return distance(unit, other) <= unit.sight;
      });
      if (enemyUnits.length) {
        candidates = enemyUnits;
      } else {
        candidates = this.towers.filter((tower) => tower.alive && tower.playerId !== unit.playerId);
      }
    }
    if (!candidates.length) {
      unit.targetId = null;
      return;
    }
    candidates.sort((a, b) => {
      const lanePenaltyA = this.lanePenalty(unit, a);
      const lanePenaltyB = this.lanePenalty(unit, b);
      return distance(unit, a) + lanePenaltyA - (distance(unit, b) + lanePenaltyB);
    });
    unit.targetId = candidates[0].id;
  }

  lanePenalty(unit, target) {
    if (target.type === 'unit') {
      return 0;
    }
    if (target.kind === 'king') {
      const laneTower = this.getTower(target.playerId, unit.lane, 'princess');
      if (laneTower?.alive) {
        return 260;
      }
    }
    if (target.lane !== 'center' && target.lane !== unit.lane) {
      return 175;
    }
    return 0;
  }

  followLanePath(unit, dt) {
    const enemyId = unit.playerId === 1 ? 2 : 1;
    const laneTower = this.getTower(enemyId, unit.lane, 'princess');
    const kingTower = this.getTower(enemyId, 'center', 'king');
    const destination = laneTower?.alive ? laneTower : kingTower;
    if (!destination) {
      return;
    }
    const bridgeX = ARENA.laneX[unit.lane];
    const direction = unit.playerId === 1 ? -1 : 1;
    const beforeRiver = unit.playerId === 1 ? unit.y > ARENA.riverBottom : unit.y < ARENA.riverTop;
    const insideRiverBand = unit.y >= ARENA.riverTop - 30 && unit.y <= ARENA.riverBottom + 30;
    if (beforeRiver || insideRiverBand) {
      const waypointY = unit.playerId === 1 ? ARENA.riverBottom - 8 : ARENA.riverTop + 8;
      this.moveUnitToward(unit, bridgeX, waypointY, dt);
      return;
    }
    if (direction < 0 && unit.y < ARENA.riverTop) {
      this.moveUnitToward(unit, destination.x, destination.y, dt);
      return;
    }
    if (direction > 0 && unit.y > ARENA.riverBottom) {
      this.moveUnitToward(unit, destination.x, destination.y, dt);
      return;
    }
    this.moveUnitToward(unit, bridgeX, unit.y + direction * 100, dt);
  }

  moveUnitToward(unit, targetX, targetY, dt) {
    const dx = targetX - unit.x;
    const dy = targetY - unit.y;
    const length = Math.hypot(dx, dy) || 1;
    let speedMultiplier = 1;
    const slowEffect = this.effects
      .filter((effect) => effect.type === 'slow' && effect.targetId === unit.id)
      .sort((a, b) => a.multiplier - b.multiplier)[0];
    if (slowEffect) {
      speedMultiplier *= slowEffect.multiplier;
    }
    if (this.chaosActive?.type === 'mud') {
      speedMultiplier *= 0.72;
    }
    if (this.chaosActive?.type === 'turbo') {
      speedMultiplier *= 1.2;
    }
    const movement = unit.speed * speedMultiplier * dt;
    unit.x += dx / length * movement;
    unit.y += dy / length * movement;
    unit.facing = Math.atan2(dy, dx);
    unit.walkCycle += dt * unit.speed * 0.045;
  }

  faceTarget(unit, target) {
    unit.facing = Math.atan2(target.y - unit.y, target.x - unit.x);
  }

  performUnitAttack(unit, target) {
    const speed = unit.attackSpeed / Math.max(0.1, unit.attackSpeedMultiplier);
    unit.attackCooldown = speed;
    let missChance = unit.missChance || 0;
    const confusion = this.effects.find((effect) => effect.type === 'confusion' && effect.targetId === unit.id);
    if (confusion) {
      missChance += confusion.amount;
    }
    if (chance(clamp(missChance, 0, 0.75))) {
      this.addFloater(target.x + randomRange(-20, 20), target.y - target.radius, 'ERROU!', '#cdd6ef', 0.7);
      this.emitParticles(target.x, target.y, '#b8c4dd', 5, 70, 0.35);
      unit.rotation = randomRange(-0.3, 0.3);
      audio.error();
      return;
    }
    const isCritical = chance(unit.critChance || 0);
    const critMultiplier = isCritical ? unit.critMultiplier || 1.7 : 1;
    const damage = unit.damage * unit.damageMultiplier * critMultiplier;
    if (unit.projectileSpeed) {
      this.spawnProjectile({
        x: unit.x,
        y: unit.y,
        targetId: target.id,
        playerId: unit.playerId,
        damage,
        speed: unit.projectileSpeed,
        color: PLAYER_COLORS[unit.playerId].light,
        radius: isCritical ? 10 : 7,
        sourceId: unit.id,
        isCritical,
        special: unit.special
      });
    } else {
      this.applyAttackDamage(unit, target, damage, isCritical);
    }
    unit.rotation = unit.playerId === 1 ? -0.12 : 0.12;
    if (isCritical) {
      this.addFloater(target.x, target.y - target.radius - 8, 'CRÍTICO!', '#ffe16c', 0.85);
      this.addArenaRing(target.x, target.y, '#ffe16c', 90, 0.46);
    }
  }

  applyAttackDamage(unit, target, damage, isCritical = false) {
    if (unit.special === 'suicideBomb') {
      this.explodeUnit(unit, target.x, target.y, unit.damage * unit.damageMultiplier, unit.splash || 140);
      return;
    }
    if (unit.special === 'towerDive' && target.type === 'tower') {
      this.dealDamage(target, damage, {
        playerId: unit.playerId,
        sourceId: unit.id,
        kind: 'towerDive',
        critical: true,
        color: '#ffe06e'
      });
      this.explodeUnit(unit, target.x, target.y, damage * 0.32, unit.splash || 100, true);
      return;
    }
    this.dealDamage(target, damage, {
      playerId: unit.playerId,
      sourceId: unit.id,
      kind: 'melee',
      critical: isCritical,
      color: isCritical ? '#ffe16c' : PLAYER_COLORS[unit.playerId].light
    });
    if (unit.knockback && target.type === 'unit' && target.alive) {
      this.applyKnockback(target, unit, unit.knockback);
    }
    if (unit.special === 'milkLatch' && target.type === 'unit' && target.alive) {
      this.applyMilkEffect(unit, target);
    }
    if (unit.special === 'guitarSmash') {
      this.addArenaRing(target.x, target.y, '#9b75ff', 78, 0.34);
      this.emitParticles(target.x, target.y, '#9b75ff', 8, 100, 0.45);
    }
  }

  applyMilkEffect(unit, target) {
    this.effects = this.effects.filter((effect) => !(effect.type === 'slow' && effect.targetId === target.id));
    this.effects.push({
      id: uid('slow'),
      type: 'slow',
      targetId: target.id,
      sourceId: unit.id,
      sourcePlayerId: unit.playerId,
      remaining: 3.2,
      multiplier: 0.52
    });
    this.effects.push({
      id: uid('dot'),
      type: 'dot',
      targetId: target.id,
      sourceId: unit.id,
      sourcePlayerId: unit.playerId,
      remaining: 3.2,
      damage: 24,
      interval: 0.5,
      tick: 0.5
    });
    this.addFloater(target.x, target.y - target.radius, 'LEITE!', '#fff7de', 0.8);
    this.emitParticles(target.x, target.y, '#fff7de', 11, 76, 0.55);
  }

  applyKnockback(target, source, amount) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const resistance = clamp(target.mass / 1.6, 0.25, 1);
    const force = amount * (1.15 - resistance * 0.55);
    target.x += dx / length * force;
    target.y += dy / length * force;
    target.rotation = randomRange(-0.24, 0.24);
  }

  updateTowers(dt) {
    this.towers.forEach((tower) => {
      if (!tower.alive) {
        return;
      }
      tower.attackCooldown = Math.max(0, tower.attackCooldown - dt);
      tower.hitFlash = Math.max(0, tower.hitFlash - dt);
      if (tower.kind === 'king') {
        const sideTowerDestroyed = this.towers.some((other) => other.playerId === tower.playerId && other.kind === 'princess' && !other.alive);
        const wasDamaged = tower.hp < tower.maxHp;
        tower.activation = lerp(tower.activation, sideTowerDestroyed || wasDamaged ? 1 : 0.35, clamp(dt * 2.5, 0, 1));
      }
      const candidates = this.units.filter((unit) => unit.alive && unit.playerId !== tower.playerId && distance(tower, unit) <= tower.range);
      if (!candidates.length) {
        tower.targetId = null;
        return;
      }
      candidates.sort((a, b) => distance(tower, a) - distance(tower, b));
      const target = candidates[0];
      tower.targetId = target.id;
      if (tower.attackCooldown <= 0) {
        tower.attackCooldown = tower.attackSpeed;
        this.spawnProjectile({
          x: tower.x,
          y: tower.y,
          targetId: target.id,
          playerId: tower.playerId,
          damage: tower.damage,
          speed: 590,
          color: tower.kind === 'king' ? '#ffd75e' : PLAYER_COLORS[tower.playerId].light,
          radius: tower.kind === 'king' ? 10 : 8,
          sourceId: tower.id,
          isCritical: false,
          special: tower.kind === 'king' ? 'kingTowerShot' : 'towerShot'
        });
      }
    });
  }

  spawnProjectile(data) {
    this.projectiles.push({
      id: uid('projectile'),
      type: 'projectile',
      alive: true,
      x: data.x,
      y: data.y,
      previousX: data.x,
      previousY: data.y,
      targetId: data.targetId,
      playerId: data.playerId,
      damage: data.damage,
      speed: data.speed,
      color: data.color,
      radius: data.radius,
      sourceId: data.sourceId,
      isCritical: Boolean(data.isCritical),
      special: data.special,
      life: 3
    });
  }

  updateProjectiles(dt) {
    this.projectiles.forEach((projectile) => {
      if (!projectile.alive) {
        return;
      }
      projectile.life -= dt;
      const target = this.findDamageableById(projectile.targetId);
      if (!target || !target.alive || projectile.life <= 0) {
        projectile.alive = false;
        return;
      }
      projectile.previousX = projectile.x;
      projectile.previousY = projectile.y;
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const length = Math.hypot(dx, dy) || 1;
      const movement = projectile.speed * dt;
      if (length <= movement + target.radius) {
        projectile.x = target.x;
        projectile.y = target.y;
        projectile.alive = false;
        const source = this.findDamageableById(projectile.sourceId);
        if (source?.type === 'unit') {
          this.applyAttackDamage(source, target, projectile.damage, projectile.isCritical);
        } else {
          this.dealDamage(target, projectile.damage, {
            playerId: projectile.playerId,
            sourceId: projectile.sourceId,
            kind: 'projectile',
            critical: projectile.isCritical,
            color: projectile.color
          });
        }
        this.emitParticles(target.x, target.y, projectile.color, projectile.isCritical ? 12 : 7, projectile.isCritical ? 140 : 85, 0.45);
        return;
      }
      projectile.x += dx / length * movement;
      projectile.y += dy / length * movement;
      if (appState.settings.particles && chance(0.55)) {
        this.particles.push({
          id: uid('trail'),
          x: projectile.x,
          y: projectile.y,
          vx: randomRange(-14, 14),
          vy: randomRange(-14, 14),
          size: randomRange(2, 5),
          color: projectile.color,
          life: randomRange(0.18, 0.34),
          maxLife: 0.34,
          gravity: 0,
          alpha: 0.8
        });
      }
    });
  }

  dealDamage(target, rawDamage, meta = {}) {
    if (!target || !target.alive || rawDamage <= 0) {
      return;
    }
    const damage = Math.max(1, Math.round(rawDamage));
    target.hp -= damage;
    target.damageTaken = (target.damageTaken || 0) + damage;
    target.hitFlash = 0.12;
    const player = this.players[meta.playerId];
    if (player) {
      player.damage += damage;
    }
    this.totalDamage += damage;
    this.addFloater(
      target.x + randomRange(-10, 10),
      target.y - target.radius * 0.75,
      `-${formatNumber(damage)}`,
      meta.critical ? '#ffe065' : meta.color || '#ffffff',
      meta.critical ? 0.9 : 0.66,
      meta.critical ? 1.2 : 1
    );
    if (!meta.silent) {
      if (target.type === 'tower') {
        audio.towerHit();
        this.shake = Math.max(this.shake, meta.critical ? 9 : 4);
      } else {
        audio.hit(meta.critical || damage >= 350);
      }
    }
    if (target.type === 'unit' && target.special === 'suicideBomb' && target.alive) {
      const source = this.findDamageableById(meta.sourceId);
      const x = source?.x ?? target.x;
      const y = source?.y ?? target.y;
      this.explodeUnit(target, x, y, target.damage * target.damageMultiplier, target.splash || 145);
      return;
    }
    if (target.hp <= 0) {
      target.hp = 0;
      if (target.type === 'tower') {
        this.destroyTower(target, meta.playerId);
      } else {
        this.killUnit(target, meta);
      }
    }
  }

  killUnit(unit, meta = {}) {
    if (!unit.alive) {
      return;
    }
    unit.alive = false;
    unit.deathTimer = 0.32;
    this.emitParticles(unit.x, unit.y, PLAYER_COLORS[unit.playerId].light, 10, 115, 0.55);
    this.addArenaRing(unit.x, unit.y, PLAYER_COLORS[unit.playerId].main, 54, 0.38);
    if (unit.special === 'elixirGenerator') {
      this.addFloater(unit.x, unit.y - 20, 'CAIXA FECHOU', '#d9a8ff', 0.85);
    }
    if (unit.special === 'suicideBomb' && meta.kind !== 'explosion') {
      this.explodeUnit(unit, unit.x, unit.y, unit.damage * unit.damageMultiplier, unit.splash || 145, true);
    }
  }

  explodeUnit(unit, x, y, damage, radius, alreadyDead = false) {
    if (!alreadyDead) {
      unit.alive = false;
      unit.hp = 0;
    }
    const enemyUnits = this.units.filter((target) => target.alive && target.playerId !== unit.playerId && distance({ x, y }, target) <= radius + target.radius);
    const enemyTowers = this.towers.filter((target) => target.alive && target.playerId !== unit.playerId && distance({ x, y }, target) <= radius + target.radius);
    [...enemyUnits, ...enemyTowers].forEach((target) => {
      const falloff = 1 - clamp(distance({ x, y }, target) / (radius + target.radius), 0, 0.62);
      this.dealDamage(target, damage * falloff, {
        playerId: unit.playerId,
        sourceId: unit.id,
        kind: 'explosion',
        critical: false,
        color: '#ffb34c'
      });
    });
    this.emitParticles(x, y, '#ff9b38', 34, 320, 1.05);
    this.emitParticles(x, y, '#ffe06e', 18, 220, 0.62);
    this.addArenaRing(x, y, '#ffb13c', radius * 1.25, 0.64);
    this.addFloater(x, y - 25, 'BOOM!', '#ffe172', 1, 1.28);
    this.shake = Math.max(this.shake, 15);
    this.flash = Math.max(this.flash, 0.18);
    audio.explosion();
    vibrate([35, 20, 65]);
  }

  destroyTower(tower, attackerId) {
    if (!tower.alive) {
      return;
    }
    tower.alive = false;
    tower.hp = 0;
    this.emitParticles(tower.x, tower.y, '#d6a15b', 52, 360, 1.5);
    this.emitParticles(tower.x, tower.y, '#ffdf8b', 24, 240, 0.9);
    this.addArenaRing(tower.x, tower.y, '#ffcd63', 190, 0.95);
    this.shake = Math.max(this.shake, 24);
    this.flash = Math.max(this.flash, 0.24);
    audio.towerDown();
    vibrate([90, 40, 110]);
    if (attackerId && this.players[attackerId]) {
      const attacker = this.players[attackerId];
      if (!attacker.destroyedTowers.includes(tower.id)) {
        attacker.destroyedTowers.push(tower.id);
      }
      if (tower.kind === 'king') {
        attacker.crowns = 3;
      } else {
        attacker.crowns = Math.min(3, attacker.crowns + 1);
      }
    }
    this.updateScoreLabels();
    this.announce(tower.kind === 'king' ? 'Torre central destruída!' : 'Torre destruída!');
    speak(tower.kind === 'king' ? 'Torre central destruída!' : 'Torre destruída!');
    if (tower.kind === 'king') {
      this.endGame(attackerId, 'Torre central destruída');
      return;
    }
    if (this.overtime) {
      this.endGame(attackerId, 'Torre destruída na morte súbita');
    }
  }

  handleNormalTimeEnd() {
    const crownsOne = this.players[1].crowns;
    const crownsTwo = this.players[2].crowns;
    if (crownsOne !== crownsTwo) {
      const winnerId = crownsOne > crownsTwo ? 1 : 2;
      this.endGame(winnerId, 'Mais torres destruídas');
      return;
    }
    const healthOne = this.getTotalTowerHealth(1);
    const healthTwo = this.getTotalTowerHealth(2);
    if (Math.abs(healthOne - healthTwo) > 2) {
      const winnerId = healthTwo < healthOne ? 1 : 2;
      this.endGame(winnerId, 'Maior dano às torres');
      return;
    }
    this.overtime = true;
    this.overtimeRemaining = 60;
    this.doubleElixir = true;
    dom.battlePhase.textContent = 'Morte súbita';
    this.announce('Morte súbita!');
    speak('Morte súbita. A próxima torre decide!', true);
    this.addArenaRing(ARENA.centerX, ARENA.centerY, '#ffcc50', 480, 1.25);
  }

  finishByHealthComparison(reason) {
    const healthOne = this.getTotalTowerHealth(1);
    const healthTwo = this.getTotalTowerHealth(2);
    if (healthOne === healthTwo) {
      this.endGame(null, 'Empate perfeito');
      return;
    }
    const winnerId = healthOne > healthTwo ? 1 : 2;
    this.endGame(winnerId, reason);
  }

  getTotalTowerHealth(playerId) {
    return this.towers
      .filter((tower) => tower.playerId === playerId)
      .reduce((sum, tower) => sum + Math.max(0, tower.hp), 0);
  }

  endGame(winnerId, reason) {
    if (this.ended) {
      return;
    }
    this.ended = true;
    this.paused = false;
    this.result = {
      winnerId,
      reason,
      crownsOne: this.players[1].crowns,
      crownsTwo: this.players[2].crowns,
      playerOne: this.players[1].name,
      playerTwo: this.players[2].name,
      duration: Math.round(this.elapsed),
      totalDamage: Math.round(this.totalDamage),
      totalDeployments: this.totalDeployments,
      timestamp: Date.now()
    };
    this.recordResult(this.result);
    window.setTimeout(() => {
      this.showResult(this.result);
    }, 750);
    if (winnerId) {
      audio.victory();
      speak(`${this.players[winnerId].name} venceu o confronto!`, true);
    } else {
      speak('A batalha terminou empatada.', true);
    }
  }

  recordResult(result) {
    appState.stats.totalMatches = Number(appState.stats.totalMatches || 0) + 1;
    appState.stats.totalTowers = Number(appState.stats.totalTowers || 0) + result.crownsOne + result.crownsTwo;
    appState.stats.totalDeployments = Number(appState.stats.totalDeployments || 0) + result.totalDeployments;
    appState.stats.totalDamage = Number(appState.stats.totalDamage || 0) + result.totalDamage;
    if (!appState.stats.playerWins) {
      appState.stats.playerWins = {
        1: 0,
        2: 0
      };
    }
    if (result.winnerId) {
      appState.stats.playerWins[result.winnerId] = Number(appState.stats.playerWins[result.winnerId] || 0) + 1;
    } else {
      appState.stats.draws = Number(appState.stats.draws || 0) + 1;
    }
    if (!Array.isArray(appState.stats.history)) {
      appState.stats.history = [];
    }
    appState.stats.history.unshift(result);
    appState.stats.history = appState.stats.history.slice(0, 50);
    saveStorage(STORAGE_KEYS.stats, appState.stats);
    updateMenuStats();
  }

  showResult(result) {
    const winnerName = result.winnerId ? this.players[result.winnerId].name : null;
    dom.resultCrown.textContent = result.winnerId ? '♛' : '⚔';
    dom.resultKicker.textContent = result.reason;
    dom.resultTitle.textContent = result.winnerId ? `${winnerName} venceu!` : 'Empate!';
    dom.resultSubtitle.textContent = result.winnerId
      ? 'O Complexo reconhece o novo campeão da arena.'
      : 'Os dois lados resistiram até o último segundo.';
    dom.resultScore.innerHTML = `
      <div class="result-score__player">
        <strong>${escapeHtml(result.playerOne)}</strong>
        <span>Jogador 1</span>
      </div>
      <span class="result-score__number">${result.crownsOne} × ${result.crownsTwo}</span>
      <div class="result-score__player">
        <strong>${escapeHtml(result.playerTwo)}</strong>
        <span>Jogador 2</span>
      </div>
    `;
    dom.resultHighlights.innerHTML = `
      <div class="result-highlight"><span>Duração</span><strong>${formatTime(result.duration)}</strong></div>
      <div class="result-highlight"><span>Dano total</span><strong>${formatNumber(result.totalDamage)}</strong></div>
      <div class="result-highlight"><span>Cartas usadas</span><strong>${formatNumber(result.totalDeployments)}</strong></div>
    `;
    openModal(dom.resultModal);
  }

  pause() {
    if (!this.running || this.ended || !this.matchStarted) {
      return;
    }
    this.paused = true;
    openModal(dom.pauseModal);
    speak('Partida pausada.');
  }

  resume() {
    if (!this.running || this.ended) {
      return;
    }
    this.paused = false;
    this.lastTimestamp = performance.now();
    closeModal(dom.pauseModal);
    audio.click();
  }

  restart() {
    if (!this.config) {
      return;
    }
    const config = deepClone(this.config);
    this.start(config);
    toast('Partida reiniciada', 'A arena voltou ao estado inicial.', 'info');
  }

  rematch() {
    if (!this.config) {
      return;
    }
    closeModal(dom.resultModal);
    const config = deepClone(this.config);
    this.start(config);
  }

  updateChaos(dt) {
    if (!this.config.chaosMode) {
      return;
    }
    if (this.chaosActive) {
      this.chaosActive.remaining -= dt;
      if (this.chaosActive.remaining <= 0) {
        this.endChaosEvent();
      }
    } else {
      this.chaosTimer -= dt;
      if (this.chaosTimer <= 0) {
        this.triggerChaosEvent();
      }
    }
    if (this.chaosMessageTimer > 0) {
      this.chaosMessageTimer -= dt;
      if (this.chaosMessageTimer <= 0) {
        dom.chaosBanner.classList.remove('chaos-banner--show');
      }
    }
  }

  triggerChaosEvent() {
    const events = [
      {
        type: 'turbo',
        name: 'Internet pegou no tranco',
        description: 'Energia e tropas ficam mais rápidas por 10 segundos.',
        duration: 10
      },
      {
        type: 'mud',
        name: 'Chuva no Caximba',
        description: 'Todas as tropas ficam mais lentas por 9 segundos.',
        duration: 9
      },
      {
        type: 'heal',
        name: 'Reforço do Complexo',
        description: 'Todas as tropas vivas recuperam parte da vida.',
        duration: 1.2
      },
      {
        type: 'elixirGift',
        name: 'Pix misterioso',
        description: 'Os dois jogadores recebem 2 pontos de energia.',
        duration: 1.2
      },
      {
        type: 'towerRage',
        name: 'Torres revoltadas',
        description: 'As torres atiram mais rápido por 8 segundos.',
        duration: 8
      }
    ];
    const event = pickRandom(events);
    this.chaosActive = {
      ...event,
      remaining: event.duration
    };
    this.chaosMessageTimer = 4.5;
    dom.chaosBanner.textContent = `⚡ ${event.name}: ${event.description}`;
    dom.chaosBanner.classList.add('chaos-banner--show');
    this.announce(event.name);
    speak(event.name);
    if (event.type === 'heal') {
      this.units.forEach((unit) => {
        if (!unit.alive) {
          return;
        }
        const heal = Math.round(unit.maxHp * 0.18);
        unit.hp = clamp(unit.hp + heal, 0, unit.maxHp);
        this.addFloater(unit.x, unit.y - unit.radius, `+${heal}`, '#7cf5ad', 0.8);
        this.emitParticles(unit.x, unit.y, '#6df1a4', 8, 80, 0.6);
      });
    }
    if (event.type === 'elixirGift') {
      [1, 2].forEach((playerId) => {
        this.players[playerId].elixir = clamp(this.players[playerId].elixir + 2, 0, 10);
        this.updateElixirDisplay(playerId);
      });
    }
    this.addArenaRing(ARENA.centerX, ARENA.centerY, '#ffcc50', 420, 1.05);
    audio.deploy(randomInt(1, 2));
  }

  endChaosEvent() {
    this.chaosActive = null;
    this.chaosTimer = randomRange(17, 26);
  }

  getTower(playerId, lane, kind = null) {
    return this.towers.find((tower) => {
      if (tower.playerId !== playerId) {
        return false;
      }
      if (tower.lane !== lane) {
        return false;
      }
      if (kind && tower.kind !== kind) {
        return false;
      }
      return true;
    }) || null;
  }

  findDamageableById(id) {
    if (!id) {
      return null;
    }
    return this.units.find((unit) => unit.id === id) || this.towers.find((tower) => tower.id === id) || null;
  }

  resolveCollisions(dt) {
    const aliveUnits = this.units.filter((unit) => unit.alive);
    for (let index = 0; index < aliveUnits.length; index += 1) {
      const first = aliveUnits[index];
      for (let secondIndex = index + 1; secondIndex < aliveUnits.length; secondIndex += 1) {
        const second = aliveUnits[secondIndex];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const length = Math.hypot(dx, dy) || 0.001;
        const minDistance = (first.radius + second.radius) * 0.74;
        if (length >= minDistance) {
          continue;
        }
        const overlap = minDistance - length;
        const push = overlap * clamp(dt * 14, 0.08, 0.5);
        const firstWeight = second.mass / Math.max(0.1, first.mass + second.mass);
        const secondWeight = first.mass / Math.max(0.1, first.mass + second.mass);
        first.x -= dx / length * push * firstWeight;
        first.y -= dy / length * push * firstWeight;
        second.x += dx / length * push * secondWeight;
        second.y += dy / length * push * secondWeight;
      }
    }
  }

  cleanupEntities() {
    this.units = this.units.filter((unit) => unit.alive || unit.deathTimer > -0.2);
    this.units.forEach((unit) => {
      if (!unit.alive) {
        unit.deathTimer -= 1 / 60;
      }
    });
    this.projectiles = this.projectiles.filter((projectile) => projectile.alive);
    this.particles = this.particles.filter((particle) => particle.life > 0);
    this.floaters = this.floaters.filter((floater) => floater.life > 0);
    this.rings = this.rings.filter((ring) => ring.life > 0);
  }

  updateParticles(dt) {
    this.particles.forEach((particle) => {
      particle.life -= dt;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.2, dt);
      particle.vy *= Math.pow(0.32, dt);
      particle.rotation = (particle.rotation || 0) + (particle.spin || 0) * dt;
    });
  }

  updateFloaters(dt) {
    this.floaters.forEach((floater) => {
      floater.life -= dt;
      floater.y -= floater.speed * dt;
      floater.x += floater.vx * dt;
    });
  }

  updateRings(dt) {
    this.rings.forEach((ring) => {
      ring.life -= dt;
      const progress = 1 - ring.life / ring.maxLife;
      ring.radius = lerp(ring.startRadius, ring.endRadius, progress);
    });
  }

  updateVisualTimers(dt) {
    this.shake = Math.max(0, this.shake - dt * 32);
    this.flash = Math.max(0, this.flash - dt * 1.7);
    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
    }
  }

  emitParticles(x, y, color, count, speed, life) {
    if (!appState.settings.particles) {
      return;
    }
    const quality = QUALITY_PARTICLE_MULTIPLIER[appState.settings.quality] ?? 1;
    const finalCount = Math.max(1, Math.round(count * quality));
    for (let index = 0; index < finalCount; index += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const velocity = randomRange(speed * 0.25, speed);
      this.particles.push({
        id: uid('particle'),
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: randomRange(2.5, 8),
        color,
        life: randomRange(life * 0.6, life),
        maxLife: life,
        gravity: randomRange(18, 90),
        alpha: randomRange(0.6, 1),
        rotation: randomRange(0, Math.PI * 2),
        spin: randomRange(-6, 6)
      });
    }
  }

  addFloater(x, y, text, color = '#fff', life = 0.8, scale = 1) {
    this.floaters.push({
      id: uid('floater'),
      x,
      y,
      text,
      color,
      life,
      maxLife: life,
      speed: randomRange(38, 60),
      vx: randomRange(-8, 8),
      scale
    });
  }

  addArenaRing(x, y, color, endRadius, life = 0.7, startRadius = 8) {
    this.rings.push({
      id: uid('ring'),
      x,
      y,
      color,
      radius: startRadius,
      startRadius,
      endRadius,
      life,
      maxLife: life
    });
  }

  spawnOpeningSparkles() {
    this.emitParticles(ARENA.centerX, ARENA.centerY, '#ffdc66', 48, 360, 1.2);
    this.addArenaRing(ARENA.centerX, ARENA.centerY, '#ffffff', 360, 1.05);
  }

  announce(text) {
    dom.arenaAnnouncement.textContent = text;
    dom.arenaAnnouncement.classList.remove('arena-announcement--show');
    void dom.arenaAnnouncement.offsetWidth;
    dom.arenaAnnouncement.classList.add('arena-announcement--show');
    this.announcementTimer = 1.6;
  }

  updateScoreLabels() {
    dom.battleCrownsOne.textContent = `${this.players[1].crowns} torre${this.players[1].crowns === 1 ? '' : 's'}`;
    dom.battleCrownsTwo.textContent = `${this.players[2].crowns} torre${this.players[2].crowns === 1 ? '' : 's'}`;
  }

  updateLaneLabels() {
    dom.laneLabelOne.textContent = this.players[1].lane === 'left' ? 'Ponte esquerda' : 'Ponte direita';
    dom.laneLabelTwo.textContent = this.players[2].lane === 'left' ? 'Ponte esquerda' : 'Ponte direita';
  }

  updateElixirDisplay(playerId) {
    const player = this.players[playerId];
    const bar = playerId === 1 ? dom.elixirBarOne : dom.elixirBarTwo;
    const value = playerId === 1 ? dom.elixirValueOne : dom.elixirValueTwo;
    bar.style.width = `${clamp(player.elixir / player.maxElixir * 100, 0, 100)}%`;
    value.textContent = formatDecimal(player.elixir, 1);
  }

  selectCard(playerId, index) {
    const player = this.players[playerId];
    if (!player || index < 0 || index >= player.hand.length) {
      return;
    }
    player.selectedIndex = index;
    this.renderHand(playerId);
    audio.select(playerId);
  }

  setLane(playerId, lane) {
    const player = this.players[playerId];
    if (!player || !['left', 'right'].includes(lane)) {
      return;
    }
    player.lane = lane;
    this.updateLaneLabels();
    audio.select(playerId);
  }

  cycleLane(playerId, direction) {
    const player = this.players[playerId];
    if (!player) {
      return;
    }
    if (direction === 'left') {
      player.lane = 'left';
    } else if (direction === 'right') {
      player.lane = 'right';
    } else {
      player.lane = player.lane === 'left' ? 'right' : 'left';
    }
    this.updateLaneLabels();
    audio.select(playerId);
  }

  deploySelected(playerId) {
    if (!this.running || this.paused || this.ended || !this.matchStarted) {
      if (!this.matchStarted && this.running) {
        audio.error();
      }
      return false;
    }
    const player = this.players[playerId];
    const cardId = player.hand[player.selectedIndex];
    const card = getCard(cardId);
    if (!card) {
      return false;
    }
    if (player.elixir + 0.0001 < card.cost) {
      audio.error();
      this.addFloater(
        player.lane === 'left' ? ARENA.laneX.left : ARENA.laneX.right,
        playerId === 1 ? ARENA.spawnY[1] : ARENA.spawnY[2],
        'SEM ENERGIA',
        '#ff92a3',
        0.8
      );
      toast(`Jogador ${playerId}`, 'Energia insuficiente para essa carta.', 'warning', 1700);
      return false;
    }
    if (this.elapsed - player.lastDeployAt < 0.16) {
      return false;
    }
    player.lastDeployAt = this.elapsed;
    player.elixir = clamp(player.elixir - card.cost, 0, 10);
    player.deployments += 1;
    this.totalDeployments += 1;
    this.spawnCard(card, playerId, player.lane);
    this.cycleHand(playerId, player.selectedIndex);
    this.updateElixirDisplay(playerId);
    this.updateHandsAffordability();
    audio.deploy(playerId);
    vibrate(20);
    return true;
  }

  cycleHand(playerId, usedIndex) {
    const player = this.players[playerId];
    const nextCard = player.deck[player.queueIndex % player.deck.length];
    player.queueIndex = (player.queueIndex + 1) % player.deck.length;
    player.hand[usedIndex] = nextCard;
    this.renderHand(playerId);
  }

  spawnCard(card, playerId, lane) {
    const baseX = ARENA.laneX[lane];
    const baseY = ARENA.spawnY[playerId];
    this.addArenaRing(baseX, baseY, PLAYER_COLORS[playerId].light, 100, 0.62);
    this.emitParticles(baseX, baseY, PLAYER_COLORS[playerId].light, 17, 150, 0.72);
    if (card.special === 'familySquad') {
      this.spawnToken(TOKEN_BLUEPRINTS.familyAdult, playerId, lane, baseX - 34, baseY, {
        label: 'Adulto 1',
        sourceCard: card
      });
      this.spawnToken(TOKEN_BLUEPRINTS.familyAdult, playerId, lane, baseX + 34, baseY + (playerId === 1 ? 12 : -12), {
        label: 'Adulto 2',
        sourceCard: card
      });
      this.spawnToken(TOKEN_BLUEPRINTS.familyChild, playerId, lane, baseX, baseY + (playerId === 1 ? 58 : -58), {
        label: 'Filho',
        sourceCard: card
      });
      this.addFloater(baseX, baseY - 50, card.shortName.toUpperCase(), PLAYER_COLORS[playerId].light, 0.9);
      return;
    }
    if (card.special === 'chickenCrew') {
      this.spawnUnit(card, playerId, lane, baseX, baseY, {
        hpMultiplier: 0.72,
        damageMultiplier: 0.88
      });
      this.spawnToken(TOKEN_BLUEPRINTS.chicken, playerId, lane, baseX - 43, baseY + (playerId === 1 ? 26 : -26), {
        label: 'Galinha 1',
        sourceCard: card
      });
      this.spawnToken(TOKEN_BLUEPRINTS.chicken, playerId, lane, baseX + 43, baseY + (playerId === 1 ? 26 : -26), {
        label: 'Galinha 2',
        sourceCard: card
      });
      this.spawnToken(TOKEN_BLUEPRINTS.rooster, playerId, lane, baseX, baseY + (playerId === 1 ? 64 : -64), {
        label: 'Galo',
        sourceCard: card
      });
      this.addFloater(baseX, baseY - 50, 'GALINHEIRO!', '#ffdb6c', 1);
      return;
    }
    const unit = this.spawnUnit(card, playerId, lane, baseX, baseY);
    if (card.special === 'chaosStrike') {
      const enemies = this.units.filter((enemy) => enemy.alive && enemy.playerId !== playerId && distance(unit, enemy) <= 255);
      enemies.forEach((enemy) => {
        this.effects.push({
          id: uid('confusion'),
          type: 'confusion',
          targetId: enemy.id,
          sourceId: unit.id,
          sourcePlayerId: playerId,
          remaining: 4.2,
          amount: 0.22
        });
        this.addFloater(enemy.x, enemy.y - enemy.radius, 'CONFUSO', '#da9cff', 0.8);
      });
      this.addArenaRing(unit.x, unit.y, '#c35bf1', 255, 0.8);
    }
  }

  spawnToken(blueprint, playerId, lane, x, y, options = {}) {
    const sourceCard = options.sourceCard || {};
    const unitData = {
      id: uid('token'),
      name: options.label || blueprint.name,
      shortName: options.label || blueprint.name,
      portrait: blueprint.portrait,
      hp: blueprint.hp,
      maxHp: blueprint.hp,
      damage: blueprint.damage,
      speed: blueprint.speed,
      range: blueprint.range,
      attackSpeed: blueprint.attackSpeed,
      target: blueprint.target,
      mass: blueprint.mass,
      radius: blueprint.radius,
      sight: blueprint.sight,
      projectileSpeed: blueprint.projectileSpeed || null,
      special: 'token',
      sourceCardId: sourceCard.id || null,
      critChance: 0,
      critMultiplier: 1.6,
      missChance: 0,
      knockback: 0,
      splash: 0
    };
    return this.createUnit(unitData, playerId, lane, x, y);
  }

  spawnUnit(card, playerId, lane, x, y, modifiers = {}) {
    const unitData = {
      id: uid('unit'),
      name: card.name,
      shortName: card.shortName,
      portrait: card.portrait,
      hp: Math.round(card.hp * (modifiers.hpMultiplier || 1)),
      maxHp: Math.round(card.hp * (modifiers.hpMultiplier || 1)),
      damage: card.damage,
      speed: card.speed,
      range: card.range,
      attackSpeed: card.attackSpeed,
      target: card.target,
      mass: card.mass,
      radius: card.radius,
      sight: card.sight,
      projectileSpeed: card.projectileSpeed || null,
      special: card.special,
      sourceCardId: card.id,
      critChance: card.critChance || 0,
      critMultiplier: card.critMultiplier || 1.7,
      missChance: card.missChance || 0,
      knockback: card.knockback || 0,
      splash: card.splash || 0,
      damageMultiplier: modifiers.damageMultiplier || 1
    };
    return this.createUnit(unitData, playerId, lane, x, y);
  }

  createUnit(data, playerId, lane, x, y) {
    const unit = {
      ...data,
      type: 'unit',
      playerId,
      lane,
      x: x + randomRange(-7, 7),
      y: y + randomRange(-7, 7),
      alive: true,
      age: 0,
      attackCooldown: randomRange(0.05, 0.2),
      targetId: null,
      state: 'moving',
      facing: playerId === 1 ? -Math.PI / 2 : Math.PI / 2,
      walkCycle: randomRange(0, Math.PI * 2),
      hitFlash: 0,
      rotation: 0,
      spawnScale: 0.2,
      deathTimer: 0.32,
      damageTaken: 0,
      damageMultiplier: data.damageMultiplier || 1,
      attackSpeedMultiplier: 1,
      enraged: false,
      generatorTimer: data.special === 'elixirGenerator' ? 3.1 : 999
    };
    this.units.push(unit);
    return unit;
  }

  renderHands() {
    this.renderHand(1);
    this.renderHand(2);
  }

  renderHand(playerId) {
    const player = this.players[playerId];
    const container = playerId === 1 ? dom.handOne : dom.handTwo;
    const keys = CARD_KEYS[playerId];
    container.innerHTML = '';
    player.hand.forEach((cardId, index) => {
      const card = getCard(cardId);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `battle-card${player.selectedIndex === index ? ' battle-card--selected' : ''}`;
      button.dataset.playerId = String(playerId);
      button.dataset.index = String(index);
      button.innerHTML = `
        <img class="battle-card__image" src="${card.portrait}" alt="${escapeHtml(card.name)}">
        <span class="battle-card__shade"></span>
        <span class="battle-card__cost">${card.cost}</span>
        <span class="battle-card__key">${keys[index]}</span>
        <span class="battle-card__name">${escapeHtml(card.shortName || card.name)}</span>
      `;
      button.addEventListener('click', () => this.selectCard(playerId, index));
      container.appendChild(button);
    });
    if (!this.config.openHands) {
      const opponentContainer = playerId === 1 ? dom.handTwo : dom.handOne;
      opponentContainer.classList.toggle('battle-hand--hidden', false);
    }
    this.updateHandsAffordability();
  }

  updateHandsAffordability() {
    [1, 2].forEach((playerId) => {
      const player = this.players[playerId];
      const container = playerId === 1 ? dom.handOne : dom.handTwo;
      [...container.querySelectorAll('.battle-card')].forEach((element, index) => {
        const card = getCard(player.hand[index]);
        element.classList.toggle('battle-card--unaffordable', Boolean(card && player.elixir < card.cost));
      });
    });
  }

  keepUnitInBounds(unit) {
    unit.x = clamp(unit.x, unit.radius + 18, ARENA.width - unit.radius - 18);
    unit.y = clamp(unit.y, unit.radius + 18, ARENA.height - unit.radius - 18);
  }

  draw() {
    const ctx = this.ctx;
    const shakeX = this.shake > 0 ? randomRange(-this.shake, this.shake) : 0;
    const shakeY = this.shake > 0 ? randomRange(-this.shake, this.shake) : 0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b1421';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    ctx.translate(shakeX, shakeY);
    this.drawArenaBackground(ctx);
    this.drawDeploymentHints(ctx);
    this.drawTowers(ctx);
    this.drawUnits(ctx);
    this.drawProjectiles(ctx);
    this.drawRings(ctx);
    this.drawParticles(ctx);
    this.drawFloaters(ctx);
    this.drawArenaOverlay(ctx);
    ctx.restore();
    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(this.flash, 0, 0.28);
      ctx.fillStyle = '#fff2c2';
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
      ctx.restore();
    }
  }

  drawArenaBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ARENA.height);
    gradient.addColorStop(0, '#3d6940');
    gradient.addColorStop(0.47, '#315e36');
    gradient.addColorStop(0.53, '#305d36');
    gradient.addColorStop(1, '#3d6940');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    this.drawGrassTexture(ctx);
    this.drawTerritoryTint(ctx);
    this.drawRiver(ctx);
    this.drawBridges(ctx);
    this.drawArenaBorders(ctx);
    this.drawLaneGuides(ctx);
    this.drawCenterEmblem(ctx);
  }

  drawGrassTexture(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    for (let y = 0; y < ARENA.height; y += 52) {
      for (let x = 0; x < ARENA.width; x += 52) {
        const offset = ((x / 52 + y / 52) % 2) * 7;
        ctx.fillStyle = (x / 52 + y / 52) % 2 ? '#77a45f' : '#244c30';
        ctx.fillRect(x + offset, y, 45, 45);
      }
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#a6c47d';
    ctx.lineWidth = 1;
    for (let index = 0; index < 180; index += 1) {
      const x = (index * 137) % ARENA.width;
      const y = (index * 311) % ARENA.height;
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.quadraticCurveTo(x + 2, y - 2, x + 5, y - 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTerritoryTint(ctx) {
    const topGradient = ctx.createLinearGradient(0, 0, 0, 580);
    topGradient.addColorStop(0, 'rgba(255, 79, 103, 0.17)');
    topGradient.addColorStop(1, 'rgba(255, 79, 103, 0)');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, ARENA.width, 610);
    const bottomGradient = ctx.createLinearGradient(0, ARENA.height, 0, 920);
    bottomGradient.addColorStop(0, 'rgba(47, 140, 255, 0.18)');
    bottomGradient.addColorStop(1, 'rgba(47, 140, 255, 0)');
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, 890, ARENA.width, 610);
  }

  drawRiver(ctx) {
    const riverGradient = ctx.createLinearGradient(0, ARENA.riverTop, 0, ARENA.riverBottom);
    riverGradient.addColorStop(0, '#1c5f8f');
    riverGradient.addColorStop(0.45, '#2e8eb6');
    riverGradient.addColorStop(1, '#174c7b');
    ctx.fillStyle = riverGradient;
    ctx.fillRect(0, ARENA.riverTop, ARENA.width, ARENA.riverBottom - ARENA.riverTop);
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = '#bdefff';
    ctx.lineWidth = 4;
    for (let x = -120; x < ARENA.width + 120; x += 95) {
      const shift = Math.sin(this.elapsed * 1.7 + x * 0.02) * 18;
      ctx.beginPath();
      ctx.moveTo(x + shift, ARENA.riverTop + 25);
      ctx.bezierCurveTo(
        x + 35 + shift,
        ARENA.riverTop + 12,
        x + 55 + shift,
        ARENA.riverBottom - 12,
        x + 94 + shift,
        ARENA.riverBottom - 25
      );
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, ARENA.riverTop, ARENA.width, 7);
    ctx.fillRect(0, ARENA.riverBottom - 7, ARENA.width, 7);
  }

  drawBridges(ctx) {
    ['left', 'right'].forEach((lane) => {
      const x = ARENA.laneX[lane];
      const left = x - ARENA.bridgeWidth / 2;
      const top = ARENA.riverTop - 12;
      const height = ARENA.riverBottom - ARENA.riverTop + 24;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(left - 8, top + 7, ARENA.bridgeWidth + 16, height);
      const bridgeGradient = ctx.createLinearGradient(left, 0, left + ARENA.bridgeWidth, 0);
      bridgeGradient.addColorStop(0, '#73502d');
      bridgeGradient.addColorStop(0.5, '#bc8a4a');
      bridgeGradient.addColorStop(1, '#73502d');
      ctx.fillStyle = bridgeGradient;
      ctx.fillRect(left, top, ARENA.bridgeWidth, height);
      ctx.strokeStyle = '#4c321e';
      ctx.lineWidth = 5;
      ctx.strokeRect(left, top, ARENA.bridgeWidth, height);
      ctx.strokeStyle = 'rgba(255, 237, 188, 0.22)';
      ctx.lineWidth = 2;
      for (let y = top + 13; y < top + height; y += 22) {
        ctx.beginPath();
        ctx.moveTo(left + 5, y);
        ctx.lineTo(left + ARENA.bridgeWidth - 5, y);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  drawArenaBorders(ctx) {
    ctx.save();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 24;
    ctx.strokeRect(6, 6, ARENA.width - 12, ARENA.height - 12);
    ctx.strokeStyle = '#d2a74c';
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, ARENA.width - 36, ARENA.height - 36);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.17)';
    ctx.lineWidth = 2;
    ctx.strokeRect(27, 27, ARENA.width - 54, ARENA.height - 54);
    ctx.restore();
  }

  drawLaneGuides(ctx) {
    ctx.save();
    ctx.setLineDash([11, 16]);
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.14;
    ['left', 'right'].forEach((lane) => {
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(ARENA.laneX[lane], 365);
      ctx.lineTo(ARENA.laneX[lane], 1135);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawCenterEmblem(ctx) {
    ctx.save();
    ctx.translate(ARENA.centerX, ARENA.centerY);
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#ffdc6b';
    ctx.fillStyle = 'rgba(255, 204, 80, 0.08)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '900 46px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe593';
    ctx.fillText('CPX', 0, 3);
    ctx.restore();
  }

  drawDeploymentHints(ctx) {
    if (!this.running || this.ended || this.paused) {
      return;
    }
    [1, 2].forEach((playerId) => {
      const player = this.players[playerId];
      const x = ARENA.laneX[player.lane];
      const y = ARENA.spawnY[playerId];
      const color = PLAYER_COLORS[playerId];
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(this.elapsed * 4) * 0.04;
      ctx.strokeStyle = color.light;
      ctx.fillStyle = color.glow;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 62 + Math.sin(this.elapsed * 5) * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  drawTowers(ctx) {
    this.towers.forEach((tower) => {
      if (!tower.alive) {
        this.drawTowerRubble(ctx, tower);
        return;
      }
      const color = PLAYER_COLORS[tower.playerId];
      const pulse = tower.kind === 'king' ? tower.activation : 1;
      ctx.save();
      ctx.translate(tower.x, tower.y);
      ctx.globalAlpha = 0.65 + pulse * 0.35;
      const shadow = ctx.createRadialGradient(0, 18, 4, 0, 18, tower.radius * 1.25);
      shadow.addColorStop(0, 'rgba(0,0,0,0.38)');
      shadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(0, 22, tower.radius * 1.25, tower.radius * 0.64, 0, 0, Math.PI * 2);
      ctx.fill();
      const bodyGradient = ctx.createLinearGradient(-tower.radius, -tower.radius, tower.radius, tower.radius);
      bodyGradient.addColorStop(0, tower.hitFlash > 0 ? '#ffffff' : color.light);
      bodyGradient.addColorStop(0.42, color.main);
      bodyGradient.addColorStop(1, color.dark);
      ctx.fillStyle = bodyGradient;
      ctx.strokeStyle = '#1c2132';
      ctx.lineWidth = 7;
      if (tower.kind === 'king') {
        this.roundRect(ctx, -58, -58, 116, 116, 18);
      } else {
        this.roundRect(ctx, -48, -48, 96, 96, 15);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#d9b76a';
      ctx.strokeStyle = '#5b4421';
      ctx.lineWidth = 5;
      const topWidth = tower.kind === 'king' ? 92 : 76;
      const topHeight = tower.kind === 'king' ? 39 : 31;
      this.roundRect(ctx, -topWidth / 2, -tower.radius - 17, topWidth, topHeight, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f6db91';
      const battlementCount = tower.kind === 'king' ? 5 : 4;
      for (let index = 0; index < battlementCount; index += 1) {
        const spacing = topWidth / battlementCount;
        ctx.fillRect(-topWidth / 2 + index * spacing + 4, -tower.radius - 26, spacing - 8, 18);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = tower.kind === 'king' ? '900 38px Impact, sans-serif' : '900 28px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      ctx.fillText(tower.kind === 'king' ? '♛' : '♜', 0, 5);
      ctx.restore();
      this.drawHealthBar(ctx, tower, tower.radius * 1.7, tower.radius + 30, color.main);
      if (tower.targetId) {
        const target = this.findDamageableById(tower.targetId);
        if (target?.alive) {
          this.drawTargetLine(ctx, tower, target, color.light, 0.12);
        }
      }
    });
  }

  drawTowerRubble(ctx, tower) {
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 18, tower.radius * 1.2, tower.radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    const color = PLAYER_COLORS[tower.playerId];
    for (let index = 0; index < 9; index += 1) {
      const angle = index / 9 * Math.PI * 2;
      const radius = randomIntFromSeed(index + tower.id.length, 18, 54);
      const size = randomIntFromSeed(index * 3 + tower.id.length, 12, 28);
      ctx.save();
      ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.55);
      ctx.rotate(angle + index * 0.3);
      ctx.fillStyle = index % 3 === 0 ? color.dark : '#6f6253';
      ctx.fillRect(-size / 2, -size / 2, size, size * 0.7);
      ctx.restore();
    }
    ctx.restore();
  }

  drawUnits(ctx) {
    const sorted = [...this.units].sort((a, b) => a.y - b.y);
    sorted.forEach((unit) => {
      if (!unit.alive && unit.deathTimer <= 0) {
        return;
      }
      const deathProgress = unit.alive ? 0 : 1 - clamp(unit.deathTimer / 0.32, 0, 1);
      const scale = unit.spawnScale * (1 - deathProgress * 0.7);
      const color = PLAYER_COLORS[unit.playerId];
      ctx.save();
      ctx.translate(unit.x, unit.y);
      ctx.rotate(unit.rotation);
      ctx.scale(scale, scale);
      ctx.globalAlpha = unit.alive ? 1 : 1 - deathProgress;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.31)';
      ctx.beginPath();
      ctx.ellipse(0, unit.radius * 0.45, unit.radius * 0.95, unit.radius * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      if (unit.enraged) {
        ctx.strokeStyle = '#ffd44f';
        ctx.lineWidth = 6;
        ctx.globalAlpha *= 0.65 + Math.sin(this.elapsed * 9) * 0.2;
        ctx.beginPath();
        ctx.arc(0, 0, unit.radius + 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = unit.alive ? 1 : 1 - deathProgress;
      }
      const slow = this.effects.some((effect) => effect.type === 'slow' && effect.targetId === unit.id);
      if (slow) {
        ctx.strokeStyle = '#f8f5df';
        ctx.lineWidth = 5;
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, unit.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = unit.alive ? 1 : 1 - deathProgress;
      }
      const confusion = this.effects.some((effect) => effect.type === 'confusion' && effect.targetId === unit.id);
      if (confusion) {
        ctx.fillStyle = '#d68cff';
        ctx.font = '900 21px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', -10, -unit.radius - 12 + Math.sin(this.elapsed * 5) * 4);
        ctx.fillText('?', 12, -unit.radius - 20 + Math.sin(this.elapsed * 5 + 2) * 4);
      }
      ctx.save();
      ctx.rotate(unit.facing + Math.PI / 2);
      const portrait = getCachedImage(unit.portrait);
      if (portrait) {
        ctx.beginPath();
        ctx.arc(0, 0, unit.radius, 0, Math.PI * 2);
        ctx.clip();
        const sourceSize = Math.min(portrait.width, portrait.height);
        const sourceX = (portrait.width - sourceSize) / 2;
        const sourceY = (portrait.height - sourceSize) / 2;
        ctx.drawImage(
          portrait,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          -unit.radius,
          -unit.radius,
          unit.radius * 2,
          unit.radius * 2
        );
      } else {
        const bodyGradient = ctx.createRadialGradient(-unit.radius * 0.3, -unit.radius * 0.35, 4, 0, 0, unit.radius);
        bodyGradient.addColorStop(0, '#ffffff');
        bodyGradient.addColorStop(0.25, color.light);
        bodyGradient.addColorStop(1, color.dark);
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, unit.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = unit.hitFlash > 0 ? '#ffffff' : color.main;
      ctx.lineWidth = unit.hitFlash > 0 ? 8 : 5;
      ctx.beginPath();
      ctx.arc(0, 0, unit.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, unit.radius - 4, Math.PI * 1.05, Math.PI * 1.85);
      ctx.stroke();
      ctx.restore();
      if (unit.alive) {
        this.drawHealthBar(ctx, unit, Math.max(54, unit.radius * 2.15), unit.radius + 17, color.main);
        this.drawUnitLabel(ctx, unit);
      }
    });
  }

  drawUnitLabel(ctx, unit) {
    const text = unit.shortName || unit.name;
    const maxLength = 15;
    const display = text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
    ctx.save();
    ctx.font = '800 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.strokeText(display, unit.x, unit.y - unit.radius - 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(display, unit.x, unit.y - unit.radius - 18);
    ctx.restore();
  }

  drawHealthBar(ctx, entity, width, offsetY, color) {
    const ratio = clamp(entity.hp / entity.maxHp, 0, 1);
    const x = entity.x - width / 2;
    const y = entity.y - offsetY;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
    this.roundRect(ctx, x - 3, y - 3, width + 6, 13, 6);
    ctx.fill();
    ctx.fillStyle = ratio > 0.28 ? color : '#ff3858';
    this.roundRect(ctx, x, y, width * ratio, 7, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.roundRect(ctx, x + 2, y + 1, Math.max(0, width * ratio - 4), 2, 1);
    ctx.fill();
    ctx.restore();
  }

  drawProjectiles(ctx) {
    this.projectiles.forEach((projectile) => {
      if (!projectile.alive) {
        return;
      }
      ctx.save();
      const gradient = ctx.createLinearGradient(projectile.previousX, projectile.previousY, projectile.x, projectile.y);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(1, projectile.color);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = projectile.radius * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(projectile.previousX, projectile.previousY);
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();
      ctx.shadowColor = projectile.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawParticles(ctx) {
    this.particles.forEach((particle) => {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1) * particle.alpha;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation || 0);
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();
    });
  }

  drawFloaters(ctx) {
    this.floaters.forEach((floater) => {
      const progress = 1 - floater.life / floater.maxLife;
      const alpha = Math.sin(clamp(floater.life / floater.maxLife, 0, 1) * Math.PI / 2);
      const scale = floater.scale * (0.82 + Math.min(progress * 1.8, 0.18));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(floater.x, floater.y);
      ctx.scale(scale, scale);
      ctx.font = '900 23px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.76)';
      ctx.strokeText(floater.text, 0, 0);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, 0, 0);
      ctx.restore();
    });
  }

  drawRings(ctx) {
    this.rings.forEach((ring) => {
      const alpha = clamp(ring.life / ring.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha * 0.72;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 7 * alpha + 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawTargetLine(ctx, source, target, color, alpha = 0.15) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.restore();
  }

  drawArenaOverlay(ctx) {
    if (!this.matchStarted && this.running && !this.ended) {
      ctx.save();
      ctx.fillStyle = 'rgba(5, 8, 18, 0.22)';
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
      ctx.restore();
    }
    if (this.paused) {
      ctx.save();
      ctx.fillStyle = 'rgba(4, 6, 14, 0.32)';
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
      ctx.restore();
    }
    if (this.chaosActive?.type === 'mud') {
      ctx.save();
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = '#8a6337';
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
      ctx.restore();
    }
    if (this.chaosActive?.type === 'turbo') {
      ctx.save();
      ctx.globalAlpha = 0.1 + Math.sin(this.elapsed * 12) * 0.025;
      const gradient = ctx.createLinearGradient(0, 0, ARENA.width, ARENA.height);
      gradient.addColorStop(0, '#d85bff');
      gradient.addColorStop(1, '#4ba9ff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
      ctx.restore();
    }
  }

  roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
}

function randomIntFromSeed(seed, min, max) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  const normalized = value - Math.floor(value);
  return Math.floor(min + normalized * (max - min + 1));
}

let battle = null;

function startBattleFromSetup() {
  saveNames();
  if (!validateDeck(appState.decks[1]) || !validateDeck(appState.decks[2])) {
    toast('Deck inválido', 'Cada jogador precisa de exatamente 8 cartas.', 'error');
    audio.error();
    return;
  }
  const config = {
    duration: Number(dom.matchDuration.value),
    initialElixir: Number(dom.initialElixir.value),
    chaosMode: dom.chaosMode.checked,
    openHands: dom.openHands.checked,
    playerNames: {
      1: appState.names[1],
      2: appState.names[2]
    },
    decks: {
      1: [...appState.decks[1]],
      2: [...appState.decks[2]]
    }
  };
  showScreen('battleScreen');
  battle.start(config);
}

function bindNavigation() {
  document.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => {
      const screen = button.dataset.back;
      showScreen(screen || 'menuScreen');
    });
  });
  dom.quickBattleButton.addEventListener('click', () => showScreen('setupScreen'));
  dom.deckButton.addEventListener('click', () => openDeckEditor(1, 'menuScreen'));
  dom.collectionButton.addEventListener('click', () => showScreen('collectionScreen'));
  dom.tutorialButton.addEventListener('click', () => showScreen('tutorialScreen'));
  dom.statsButton.addEventListener('click', () => showScreen('statsScreen'));
  dom.settingsShortcut.addEventListener('click', () => showScreen('settingsScreen'));
  dom.soundToggle.addEventListener('click', () => {
    appState.settings.sound = !appState.settings.sound;
    saveStorage(STORAGE_KEYS.settings, appState.settings);
    audio.updateVolume();
    updateMenuStats();
    if (appState.settings.sound) {
      audio.click();
    }
  });
  dom.deckBackButton.addEventListener('click', () => showScreen(appState.deckEditingReturn || 'menuScreen'));
  document.querySelectorAll('[data-edit-deck]').forEach((button) => {
    button.addEventListener('click', () => openDeckEditor(Number(button.dataset.editDeck), 'setupScreen'));
  });
}

function bindDeckEditor() {
  dom.deckSearch.addEventListener('input', renderDeckCards);
  dom.deckFilter.addEventListener('change', renderDeckCards);
  dom.deckSort.addEventListener('change', renderDeckCards);
  dom.randomDeckButton.addEventListener('click', () => {
    appState.deckDraft = randomDeck();
    renderDeckEditor();
    audio.deploy(appState.deckEditingPlayer);
    toast('Deck sorteado', 'Uma combinação aleatória foi montada.', 'info', 1800);
  });
  dom.saveDeckButton.addEventListener('click', saveEditedDeck);
}

function bindSettingsAndStats() {
  dom.clearStatsButton.addEventListener('click', clearStats);
  dom.saveSettingsButton.addEventListener('click', saveSettings);
  dom.settingsVolume.addEventListener('input', () => {
    appState.settings.volume = clamp(Number(dom.settingsVolume.value), 0, 1);
    audio.updateVolume();
  });
}

function bindSetup() {
  dom.playerOneName.addEventListener('change', saveNames);
  dom.playerTwoName.addEventListener('change', saveNames);
  dom.startBattleButton.addEventListener('click', startBattleFromSetup);
}

function bindModals() {
  document.querySelectorAll('[data-close-card]').forEach((element) => {
    element.addEventListener('click', () => closeModal(dom.cardModal));
  });
  dom.resumeButton.addEventListener('click', () => battle.resume());
  dom.restartButton.addEventListener('click', () => {
    closeModal(dom.pauseModal);
    battle.restart();
  });
  dom.quitBattleButton.addEventListener('click', () => {
    closeModal(dom.pauseModal);
    battle.stop();
    showScreen('menuScreen');
  });
  dom.rematchButton.addEventListener('click', () => battle.rematch());
  dom.resultMenuButton.addEventListener('click', () => {
    closeModal(dom.resultModal);
    battle.stop();
    showScreen('menuScreen');
  });
  dom.pauseModal.querySelector('.modal__backdrop').addEventListener('click', () => battle.resume());
}

function bindBattleControls() {
  dom.pauseButton.addEventListener('click', () => battle.pause());
  dom.deployOneButton.addEventListener('click', () => battle.deploySelected(1));
  dom.deployTwoButton.addEventListener('click', () => battle.deploySelected(2));
  document.querySelectorAll('[data-lane-player]').forEach((button) => {
    button.addEventListener('click', () => {
      battle.setLane(Number(button.dataset.lanePlayer), button.dataset.lane);
    });
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat && ['Enter', 'KeyS'].includes(event.code)) {
      return;
    }
    if (event.code === 'Escape') {
      if (dom.cardModal.classList.contains('modal--open')) {
        closeModal(dom.cardModal);
        return;
      }
      if (appState.currentScreen === 'battleScreen') {
        if (battle.paused) {
          battle.resume();
        } else {
          battle.pause();
        }
      }
      return;
    }
    if (appState.currentScreen !== 'battleScreen' || !battle.running) {
      return;
    }
    const key = event.key.toLowerCase();
    if (['q', 'w', 'e', 'r'].includes(key)) {
      battle.selectCard(1, ['q', 'w', 'e', 'r'].indexOf(key));
      event.preventDefault();
      return;
    }
    if (['7', '8', '9', '0'].includes(event.key)) {
      battle.selectCard(2, ['7', '8', '9', '0'].indexOf(event.key));
      event.preventDefault();
      return;
    }
    if (key === 'a') {
      battle.setLane(1, 'left');
      event.preventDefault();
      return;
    }
    if (key === 'd') {
      battle.setLane(1, 'right');
      event.preventDefault();
      return;
    }
    if (key === 's') {
      battle.deploySelected(1);
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowLeft') {
      battle.setLane(2, 'left');
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowRight') {
      battle.setLane(2, 'right');
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter') {
      battle.deploySelected(2);
      event.preventDefault();
      return;
    }
    if (event.code === 'Space') {
      if (battle.paused) {
        battle.resume();
      } else {
        battle.pause();
      }
      event.preventDefault();
    }
  }, {
    passive: false
  });
}

function bindAudioUnlock() {
  const unlock = () => {
    audio.ensureContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, {
    once: true
  });
  window.addEventListener('keydown', unlock, {
    once: true
  });
}

async function runSplash() {
  const messages = [
    'Chamando a tropa do CPX...',
    'Montando as torres...',
    'Carregando as cartas...',
    'Preparando o elixir...',
    'Abrindo os portões da arena...'
  ];
  let messageIndex = 0;
  let progress = 0;
  const minimumDuration = 1900;
  const startedAt = performance.now();
  const messageTimer = window.setInterval(() => {
    messageIndex = (messageIndex + 1) % messages.length;
    dom.loadingText.textContent = messages[messageIndex];
  }, 420);
  await preloadImages((imageProgress) => {
    progress = imageProgress * 0.86;
    dom.loadingBar.style.width = `${Math.round(progress * 100)}%`;
  });
  const elapsed = performance.now() - startedAt;
  if (elapsed < minimumDuration) {
    await new Promise((resolve) => window.setTimeout(resolve, minimumDuration - elapsed));
  }
  window.clearInterval(messageTimer);
  dom.loadingText.textContent = appState.imageErrors.size ? 'Arena pronta com alguns retratos indisponíveis.' : 'Arena pronta!';
  dom.loadingBar.style.width = '100%';
  await new Promise((resolve) => window.setTimeout(resolve, 420));
  appState.splashDone = true;
  showScreen('menuScreen', {
    force: true
  });
}

function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    console.error('Caximba Clash error:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Caximba Clash promise error:', event.reason);
  });
}

function initialize() {
  if (appState.initialized) {
    return;
  }
  appState.initialized = true;
  cacheDom();
  battle = new BattleGame(dom.gameCanvas);
  bindNavigation();
  bindDeckEditor();
  bindSettingsAndStats();
  bindSetup();
  bindModals();
  bindBattleControls();
  bindAudioUnlock();
  installGlobalErrorHandlers();
  updateMenuStats();
  renderSetup();
  renderCollection();
  renderSettings();
  renderStats();
  runSplash();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, {
    once: true
  });
} else {
  initialize();
}
