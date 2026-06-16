(() => {
  'use strict';

  const DATA = window.CAXIMBA_DATA;
  if (!DATA || !Array.isArray(DATA.cards)) {
    document.body.innerHTML = '<div style="padding:40px;color:white;font-family:sans-serif">Falha ao carregar data.js. Envie os quatro arquivos da V6 juntos.</div>';
    throw new Error('CAXIMBA_DATA não encontrado');
  }

  const VERSION = DATA.version || '6.0.0';
  const ARENA = DATA.arena;
  const CARDS = DATA.cards;
  const CARD_MAP = new Map(CARDS.map((card) => [card.id, card]));
  const STORAGE_KEY = `caximba-clash-v6-${VERSION}`;
  const PLAYER = {
    1: {
      id: 1,
      color: '#2f8eff',
      light: '#8fd0ff',
      dark: '#0c4ca9',
      territory: 'bottom',
      selectKeys: ['1', '2', '3', '4'],
      moveKeys: { up: 'w', down: 's', left: 'a', right: 'd' },
      deployKey: 'q'
    },
    2: {
      id: 2,
      color: '#ef4565',
      light: '#ff9bad',
      dark: '#a91435',
      territory: 'top',
      selectKeys: ['7', '8', '9', '0'],
      moveKeys: { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' },
      deployKey: 'l'
    }
  };

  const dom = {};
  const app = {
    currentScreen: 'splashScreen',
    editPlayer: 1,
    decks: {
      1: [...DATA.defaultDecks['1']],
      2: [...DATA.defaultDecks['2']]
    },
    sound: true,
    game: null,
    loaded: false
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function distanceXY(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
  }

  function uid(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizedText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60);
    const remainder = safe % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  function getCard(id) {
    return CARD_MAP.get(id) || null;
  }

  function saveApp() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ decks: app.decks, sound: app.sound }));
    } catch (error) {
      console.warn('Não foi possível salvar configurações.', error);
    }
  }

  function loadApp() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      for (const playerId of [1, 2]) {
        const candidate = parsed?.decks?.[playerId];
        if (Array.isArray(candidate) && candidate.length === 8 && candidate.every((id) => CARD_MAP.has(id))) {
          app.decks[playerId] = [...candidate];
        }
      }
      if (typeof parsed.sound === 'boolean') app.sound = parsed.sound;
    } catch (error) {
      console.warn('Configuração salva inválida.', error);
    }
  }

  function cacheDom() {
    const ids = [
      'splashScreen', 'loadingBar', 'loadingText', 'menuScreen', 'soundButton', 'playButton', 'deckButton',
      'showcaseCardA', 'showcaseCardB', 'deckScreen', 'deckBackButton', 'deckStartButton', 'selectedDeck1',
      'selectedDeck2', 'deckCount1', 'deckCount2', 'cardSearch', 'rarityFilter', 'sortFilter', 'editPlayer1',
      'editPlayer2', 'cardCollection', 'battleScreen', 'crowns1', 'crowns2', 'matchClock', 'matchPhase',
      'pauseButton', 'elixirFill1', 'elixirFill2', 'elixirText1', 'elixirText2', 'hand1', 'hand2',
      'deployButton1', 'deployButton2', 'arenaCanvas', 'announcement', 'pauseOverlay', 'resumeButton', 'quitButton',
      'resultOverlay', 'resultCrown', 'resultTitle', 'resultReason', 'resultScore', 'rematchButton', 'resultMenuButton',
      'toastHost'
    ];
    ids.forEach((id) => {
      dom[id] = document.getElementById(id);
    });
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('screen--active'));
    dom[id]?.classList.add('screen--active');
    app.currentScreen = id;
  }

  function showOverlay(element, visible) {
    element?.classList.toggle('overlay--active', Boolean(visible));
  }

  function toast(title, message) {
    if (!dom.toastHost) return;
    const item = document.createElement('div');
    item.className = 'toast';
    item.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
    dom.toastHost.appendChild(item);
    window.setTimeout(() => item.remove(), 2800);
  }

  function setImageWithFallback(img, primary, fallback) {
    let fallbackUsed = false;
    img.decoding = 'async';
    img.loading = 'eager';
    img.addEventListener('error', () => {
      if (!fallbackUsed && fallback) {
        fallbackUsed = true;
        img.src = fallback;
      }
    });
    img.src = primary || fallback;
  }

  function createCardImage(card, kind = 'image', alt = card.name) {
    const img = document.createElement('img');
    const primary = kind === 'portrait' ? card.portrait : card.image;
    const fallback = kind === 'portrait' ? card.portraitFallback : card.imageFallback;
    img.alt = alt;
    setImageWithFallback(img, fallback || primary, primary);
    return img;
  }

  class AssetManager {
    constructor() {
      this.images = new Map();
      this.failed = new Set();
    }

    async loadOne(key, primary, fallback) {
      const candidates = [fallback, primary].filter(Boolean);
      for (const source of candidates) {
        const image = await new Promise((resolve) => {
          const img = new Image();
          let settled = false;
          const finish = (value) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(value);
          };
          const timer = window.setTimeout(() => finish(null), 6000);
          img.onload = () => finish(img);
          img.onerror = () => finish(null);
          img.decoding = 'async';
          img.src = source;
        });
        if (image) {
          this.images.set(key, image);
          return image;
        }
      }
      this.failed.add(key);
      return null;
    }

    async loadAll(onProgress = () => {}) {
      const jobs = [];
      CARDS.forEach((card) => {
        jobs.push({ key: `${card.id}:card`, primary: card.image, fallback: card.imageFallback });
        jobs.push({ key: `${card.id}:portrait`, primary: card.portrait, fallback: card.portraitFallback });
      });
      let done = 0;
      for (const job of jobs) {
        await this.loadOne(job.key, job.primary, job.fallback);
        done += 1;
        onProgress(done / jobs.length, job.key, !this.failed.has(job.key));
      }
    }

    getCard(cardId) {
      return this.images.get(`${cardId}:card`) || null;
    }

    getPortrait(cardId) {
      return this.images.get(`${cardId}:portrait`) || this.getCard(cardId) || null;
    }
  }

  const assets = new AssetManager();

  class SoundSystem {
    constructor() {
      this.context = null;
      this.master = null;
      this.last = new Map();
    }

    ensure() {
      if (!app.sound) return false;
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.master.gain.value = 0.26;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return true;
    }

    canPlay(key, interval = 0.05) {
      const now = performance.now() / 1000;
      const previous = this.last.get(key) || -999;
      if (now - previous < interval) return false;
      this.last.set(key, now);
      return true;
    }

    tone({ frequency = 440, end = frequency, duration = 0.12, type = 'sine', volume = 0.16, delay = 0 }) {
      if (!this.ensure()) return;
      const start = this.context.currentTime + delay;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + duration + 0.03);
    }

    noise(duration = 0.16, volume = 0.11, lowpass = 1200) {
      if (!this.ensure()) return;
      const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      gain.gain.setValueAtTime(volume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start();
    }

    click() {
      this.tone({ frequency: 520, end: 760, duration: 0.07, type: 'triangle', volume: 0.08 });
    }

    deploy() {
      this.tone({ frequency: 180, end: 420, duration: 0.16, type: 'sawtooth', volume: 0.1 });
      this.tone({ frequency: 540, end: 720, duration: 0.12, type: 'triangle', volume: 0.06, delay: 0.04 });
    }

    hit(kind = 'melee') {
      if (!this.canPlay(`hit-${kind}`, 0.035)) return;
      if (kind === 'milk') {
        this.tone({ frequency: 780, end: 260, duration: 0.14, type: 'sine', volume: 0.07 });
        return;
      }
      if (kind === 'tax') {
        this.tone({ frequency: 340, end: 610, duration: 0.13, type: 'triangle', volume: 0.08 });
        return;
      }
      if (kind === 'guitar') {
        this.tone({ frequency: 96, end: 55, duration: 0.22, type: 'sawtooth', volume: 0.14 });
        this.noise(0.1, 0.06, 700);
        return;
      }
      this.tone({ frequency: 160, end: 72, duration: 0.11, type: 'square', volume: 0.08 });
      this.noise(0.07, 0.045, 900);
    }

    explosion() {
      this.tone({ frequency: 95, end: 24, duration: 0.48, type: 'sawtooth', volume: 0.2 });
      this.noise(0.42, 0.18, 560);
    }

    towerShot() {
      this.tone({ frequency: 190, end: 410, duration: 0.11, type: 'square', volume: 0.055 });
    }

    towerDestroyed() {
      this.explosion();
      this.tone({ frequency: 220, end: 50, duration: 0.72, type: 'triangle', volume: 0.16, delay: 0.08 });
    }

    victory() {
      [0, 0.15, 0.3, 0.5].forEach((delay, index) => {
        const notes = [220, 330, 440, 660];
        this.tone({ frequency: notes[index], end: notes[index] * 1.02, duration: 0.28, type: 'triangle', volume: 0.12, delay });
      });
    }
  }

  const sound = new SoundSystem();

  class Announcer {
    constructor() {
      this.voice = null;
      this.ready = false;
      this.refreshVoices = this.refreshVoices.bind(this);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.addEventListener?.('voiceschanged', this.refreshVoices);
        this.refreshVoices();
      }
    }

    refreshVoices() {
      if (!('speechSynthesis' in window)) return;
      const voices = window.speechSynthesis.getVoices() || [];
      this.voice = voices.find((voice) => /pt[-_]?br/i.test(voice.lang) && /(male|masc|ricardo|antonio|carlos|lucas|felipe|google)/i.test(`${voice.name} ${voice.voiceURI}`))
        || voices.find((voice) => /pt[-_]?br/i.test(voice.lang))
        || voices.find((voice) => /en[-_]?us/i.test(voice.lang) && /(male|david|mark|daniel|google)/i.test(`${voice.name} ${voice.voiceURI}`))
        || voices[0]
        || null;
      this.ready = Boolean(this.voice);
    }

    speak(text, priority = false) {
      if (!app.sound || !('speechSynthesis' in window)) return;
      if (priority) window.speechSynthesis.cancel();
      sound.tone({ frequency: 70, end: 42, duration: 0.3, type: 'sawtooth', volume: 0.09 });
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.voice?.lang || 'pt-BR';
      utterance.voice = this.voice || null;
      utterance.rate = 0.78;
      utterance.pitch = 0.48;
      utterance.volume = 1;
      window.setTimeout(() => window.speechSynthesis.speak(utterance), 80);
    }
  }

  const announcer = new Announcer();

  function renderShowcase() {
    const first = getCard('austin-boss');
    const second = getCard('rei-do-ataque');
    [
      [dom.showcaseCardA, first],
      [dom.showcaseCardB, second]
    ].forEach(([container, card]) => {
      if (!container || !card) return;
      container.replaceChildren(createCardImage(card, 'image'));
    });
  }

  function renderDecks() {
    for (const playerId of [1, 2]) {
      const host = dom[`selectedDeck${playerId}`];
      const deck = app.decks[playerId];
      host.replaceChildren();
      deck.forEach((cardId) => {
        const card = getCard(cardId);
        if (!card) return;
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'deck-slot';
        slot.dataset.cardId = card.id;
        slot.dataset.playerId = String(playerId);
        slot.appendChild(createCardImage(card, 'image'));
        const cost = document.createElement('span');
        cost.className = 'deck-slot__cost';
        cost.textContent = card.cost;
        const name = document.createElement('span');
        name.className = 'deck-slot__name';
        name.textContent = card.name;
        slot.append(cost, name);
        slot.addEventListener('click', () => removeCardFromDeck(playerId, card.id));
        host.appendChild(slot);
      });
      dom[`deckCount${playerId}`].textContent = `${deck.length}/8 cartas`;
    }
    renderCollection();
  }

  function renderCollection() {
    const query = normalizedText(dom.cardSearch?.value || '');
    const rarity = dom.rarityFilter?.value || 'all';
    const sort = dom.sortFilter?.value || 'cost';
    const activeDeck = app.decks[app.editPlayer];
    const filtered = CARDS.filter((card) => {
      const matchesQuery = !query || normalizedText(`${card.name} ${card.role} ${card.description}`).includes(query);
      const matchesRarity = rarity === 'all' || card.rarity === rarity;
      return matchesQuery && matchesRarity;
    });
    filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR');
      if (sort === 'rarity') {
        const order = { Comum: 1, Rara: 2, Épica: 3 };
        return (order[a.rarity] || 9) - (order[b.rarity] || 9) || a.cost - b.cost;
      }
      return a.cost - b.cost || a.name.localeCompare(b.name, 'pt-BR');
    });
    dom.cardCollection.replaceChildren();
    filtered.forEach((card) => {
      const selected = activeDeck.includes(card.id);
      const full = activeDeck.length >= 8 && !selected;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `collection-card${selected ? ' collection-card--selected' : ''}${full ? ' collection-card--full' : ''}`;
      button.dataset.cardId = card.id;
      button.appendChild(createCardImage(card, 'image'));
      const overlay = document.createElement('span');
      overlay.className = 'collection-card__overlay';
      const cost = document.createElement('span');
      cost.className = 'collection-card__cost';
      cost.textContent = card.cost;
      const name = document.createElement('span');
      name.className = 'collection-card__name';
      name.textContent = card.name;
      button.append(overlay, cost, name);
      if (selected) {
        const check = document.createElement('span');
        check.className = 'collection-card__check';
        check.textContent = '✓';
        button.appendChild(check);
      }
      button.addEventListener('click', () => toggleCardInDeck(app.editPlayer, card.id));
      dom.cardCollection.appendChild(button);
    });
  }

  function toggleCardInDeck(playerId, cardId) {
    const deck = app.decks[playerId];
    const index = deck.indexOf(cardId);
    if (index >= 0) {
      if (deck.length <= 4) {
        toast('Deck pequeno demais', 'Mantenha pelo menos quatro cartas.');
        return;
      }
      deck.splice(index, 1);
    } else {
      if (deck.length >= 8) {
        toast('Deck completo', 'Remova uma carta antes de adicionar outra.');
        return;
      }
      deck.push(cardId);
    }
    sound.click();
    saveApp();
    renderDecks();
  }

  function removeCardFromDeck(playerId, cardId) {
    const deck = app.decks[playerId];
    if (deck.length <= 4) {
      toast('Deck pequeno demais', 'Mantenha pelo menos quatro cartas.');
      return;
    }
    const index = deck.indexOf(cardId);
    if (index >= 0) {
      deck.splice(index, 1);
      sound.click();
      saveApp();
      renderDecks();
    }
  }

  function setEditPlayer(playerId) {
    app.editPlayer = playerId;
    dom.editPlayer1.classList.toggle('target-button--active', playerId === 1);
    dom.editPlayer2.classList.toggle('target-button--active', playerId === 2);
    renderCollection();
  }

  function validateDecks() {
    for (const playerId of [1, 2]) {
      if (app.decks[playerId].length < 8) {
        toast(`Deck do J${playerId} incompleto`, 'Escolha oito cartas para começar.');
        return false;
      }
    }
    return true;
  }

  function attachUiEvents() {
    dom.soundButton.addEventListener('click', () => {
      app.sound = !app.sound;
      dom.soundButton.textContent = app.sound ? '🔊' : '🔇';
      if (!app.sound && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      if (app.sound) sound.click();
      saveApp();
    });
    dom.playButton.addEventListener('click', () => {
      sound.click();
      if (validateDecks()) startBattle();
    });
    dom.deckButton.addEventListener('click', () => {
      sound.click();
      renderDecks();
      showScreen('deckScreen');
    });
    dom.deckBackButton.addEventListener('click', () => {
      sound.click();
      showScreen('menuScreen');
    });
    dom.deckStartButton.addEventListener('click', () => {
      sound.click();
      if (validateDecks()) startBattle();
    });
    dom.cardSearch.addEventListener('input', renderCollection);
    dom.rarityFilter.addEventListener('change', renderCollection);
    dom.sortFilter.addEventListener('change', renderCollection);
    dom.editPlayer1.addEventListener('click', () => setEditPlayer(1));
    dom.editPlayer2.addEventListener('click', () => setEditPlayer(2));
    dom.pauseButton.addEventListener('click', () => app.game?.pause());
    dom.resumeButton.addEventListener('click', () => app.game?.resume());
    dom.quitButton.addEventListener('click', () => {
      app.game?.destroy();
      app.game = null;
      showOverlay(dom.pauseOverlay, false);
      showScreen('menuScreen');
    });
    dom.rematchButton.addEventListener('click', () => {
      showOverlay(dom.resultOverlay, false);
      startBattle();
    });
    dom.resultMenuButton.addEventListener('click', () => {
      showOverlay(dom.resultOverlay, false);
      showScreen('menuScreen');
    });
    dom.deployButton1.addEventListener('click', () => app.game?.deploySelected(1));
    dom.deployButton2.addEventListener('click', () => app.game?.deploySelected(2));
  }

  function startBattle() {
    if (app.game) app.game.destroy();
    showOverlay(dom.pauseOverlay, false);
    showOverlay(dom.resultOverlay, false);
    showScreen('battleScreen');
    app.game = new BattleGame(dom.arenaCanvas, {
      1: [...app.decks[1]],
      2: [...app.decks[2]]
    });
    app.game.start();
  }

  function displayResult(result) {
    const winner = result.winnerId;
    dom.resultCrown.textContent = winner ? '♛' : '⚔';
    dom.resultTitle.textContent = winner ? `JOGADOR ${winner} VENCEU!` : 'EMPATE!';
    dom.resultReason.textContent = result.reason;
    dom.resultScore.textContent = `J1 ${result.crowns[1]} × ${result.crowns[2]} J2`;
    showOverlay(dom.resultOverlay, true);
  }

  class BattleGame {
    constructor(canvas, decks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      this.decks = decks;
      this.running = false;
      this.paused = false;
      this.ended = false;
      this.lastTimestamp = 0;
      this.elapsed = 0;
      this.timeLeft = 180;
      this.overtime = false;
      this.overtimeLeft = 60;
      this.doubleElixir = false;
      this.units = [];
      this.towers = [];
      this.projectiles = [];
      this.particles = [];
      this.rings = [];
      this.floaters = [];
      this.effects = [];
      this.keys = new Set();
      this.shake = 0;
      this.announcementTimer = 0;
      this.raf = 0;
      this.nextElixirUi = 0;
      this.players = {
        1: this.createPlayer(1),
        2: this.createPlayer(2)
      };
      this.cursors = {
        1: { x: 360, y: 780, valid: true },
        2: { x: 360, y: 300, valid: true }
      };
      this.boundKeyDown = this.onKeyDown.bind(this);
      this.boundKeyUp = this.onKeyUp.bind(this);
      this.loop = this.loop.bind(this);
      this.setupTowers();
      this.renderHands();
      this.updateHud(true);
    }

    createPlayer(playerId) {
      const deck = [...this.decks[playerId]];
      return {
        id: playerId,
        name: `Jogador ${playerId}`,
        deck,
        queue: deck.slice(4),
        hand: deck.slice(0, 4),
        selectedIndex: 0,
        elixir: 5,
        maxElixir: 10,
        crowns: 0,
        destroyed: [],
        deployments: 0
      };
    }

    setupTowers() {
      const definitions = [
        { id: 'p2-king', playerId: 2, kind: 'king', lane: 'center', x: 360, y: 78, hp: 5200, radius: 55, range: 255, damage: 145, attackRate: 0.85 },
        { id: 'p2-left', playerId: 2, kind: 'princess', lane: 'left', x: 190, y: 220, hp: 3100, radius: 44, range: 240, damage: 112, attackRate: 0.92 },
        { id: 'p2-right', playerId: 2, kind: 'princess', lane: 'right', x: 530, y: 220, hp: 3100, radius: 44, range: 240, damage: 112, attackRate: 0.92 },
        { id: 'p1-left', playerId: 1, kind: 'princess', lane: 'left', x: 190, y: 860, hp: 3100, radius: 44, range: 240, damage: 112, attackRate: 0.92 },
        { id: 'p1-right', playerId: 1, kind: 'princess', lane: 'right', x: 530, y: 860, hp: 3100, radius: 44, range: 240, damage: 112, attackRate: 0.92 },
        { id: 'p1-king', playerId: 1, kind: 'king', lane: 'center', x: 360, y: 1002, hp: 5200, radius: 55, range: 255, damage: 145, attackRate: 0.85 }
      ];
      this.towers = definitions.map((definition) => ({
        ...definition,
        type: 'tower',
        maxHp: definition.hp,
        alive: true,
        active: definition.kind !== 'king',
        cooldown: randomRange(0.1, 0.5),
        targetId: null,
        hitFlash: 0,
        deathTimer: 0,
        activationPulse: 0
      }));
    }

    start() {
      this.running = true;
      this.paused = false;
      this.ended = false;
      window.addEventListener('keydown', this.boundKeyDown, { passive: false });
      window.addEventListener('keyup', this.boundKeyUp, { passive: false });
      this.lastTimestamp = performance.now();
      this.announce('LUTEM!', 1.1);
      announcer.speak('Lutem!', true);
      sound.deploy();
      this.raf = requestAnimationFrame(this.loop);
    }

    destroy() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      window.removeEventListener('keydown', this.boundKeyDown);
      window.removeEventListener('keyup', this.boundKeyUp);
      this.keys.clear();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }

    pause() {
      if (this.ended || this.paused) return;
      this.paused = true;
      showOverlay(dom.pauseOverlay, true);
    }

    resume() {
      if (!this.paused) return;
      this.paused = false;
      showOverlay(dom.pauseOverlay, false);
      this.lastTimestamp = performance.now();
    }

    onKeyDown(event) {
      if (!this.running || this.ended) return;
      const key = event.key.toLowerCase();
      const controlledKeys = [
        'w', 'a', 's', 'd', 'q', '1', '2', '3', '4',
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'l', '7', '8', '9', '0',
        'escape'
      ];
      if (controlledKeys.includes(key)) event.preventDefault();
      if (key === 'escape') {
        if (this.paused) this.resume();
        else this.pause();
        return;
      }
      if (this.paused) return;
      this.keys.add(key);
      for (const playerId of [1, 2]) {
        const profile = PLAYER[playerId];
        const selectIndex = profile.selectKeys.indexOf(key);
        if (selectIndex >= 0) {
          this.selectCard(playerId, selectIndex);
          return;
        }
        if (key === profile.deployKey && !event.repeat) {
          this.deploySelected(playerId);
          return;
        }
      }
    }

    onKeyUp(event) {
      this.keys.delete(event.key.toLowerCase());
    }

    selectCard(playerId, index) {
      const player = this.players[playerId];
      if (!player || index < 0 || index >= player.hand.length) return;
      player.selectedIndex = index;
      sound.click();
      this.renderHand(playerId);
    }

    renderHands() {
      this.renderHand(1);
      this.renderHand(2);
    }

    renderHand(playerId) {
      const player = this.players[playerId];
      const host = dom[`hand${playerId}`];
      const keys = PLAYER[playerId].selectKeys;
      host.replaceChildren();
      player.hand.forEach((cardId, index) => {
        const card = getCard(cardId);
        if (!card) return;
        const selected = index === player.selectedIndex;
        const affordable = player.elixir + 0.001 >= card.cost;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `battle-card${selected ? ` battle-card--selected-${playerId === 1 ? 'blue' : 'red'}` : ''}${affordable ? '' : ' battle-card--locked'}`;
        button.dataset.index = String(index);
        button.appendChild(createCardImage(card, 'image'));
        const shade = document.createElement('span');
        shade.className = 'battle-card__shade';
        const cost = document.createElement('span');
        cost.className = 'battle-card__cost';
        cost.textContent = card.cost;
        const key = document.createElement('span');
        key.className = 'battle-card__key';
        key.textContent = keys[index];
        const name = document.createElement('span');
        name.className = 'battle-card__name';
        name.textContent = card.name;
        button.append(shade, cost, key, name);
        button.addEventListener('click', () => this.selectCard(playerId, index));
        host.appendChild(button);
      });
    }

    updateHud(force = false) {
      const now = performance.now();
      if (!force && now < this.nextElixirUi) return;
      this.nextElixirUi = now + 90;
      for (const playerId of [1, 2]) {
        const player = this.players[playerId];
        dom[`elixirFill${playerId}`].style.width = `${clamp(player.elixir / player.maxElixir, 0, 1) * 100}%`;
        dom[`elixirText${playerId}`].textContent = player.elixir.toFixed(1).replace('.', ',');
        dom[`crowns${playerId}`].textContent = player.crowns;
      }
      dom.matchClock.textContent = formatTime(this.overtime ? this.overtimeLeft : this.timeLeft);
      dom.matchPhase.textContent = this.overtime ? 'MORTE SÚBITA' : this.doubleElixir ? 'ELIXIR DUPLO' : 'TEMPO NORMAL';
      this.renderHands();
    }

    announce(text, duration = 0.9) {
      dom.announcement.textContent = text;
      dom.announcement.classList.add('announcement--show');
      this.announcementTimer = duration;
    }

    updateAnnouncement(dt) {
      if (this.announcementTimer <= 0) return;
      this.announcementTimer -= dt;
      if (this.announcementTimer <= 0) dom.announcement.classList.remove('announcement--show');
    }

    updateCursorMovement(dt) {
      const speed = 360;
      for (const playerId of [1, 2]) {
        const profile = PLAYER[playerId];
        const cursor = this.cursors[playerId];
        let dx = 0;
        let dy = 0;
        if (this.keys.has(profile.moveKeys.left)) dx -= 1;
        if (this.keys.has(profile.moveKeys.right)) dx += 1;
        if (this.keys.has(profile.moveKeys.up)) dy -= 1;
        if (this.keys.has(profile.moveKeys.down)) dy += 1;
        if (dx || dy) {
          const direction = normalize(dx, dy);
          cursor.x += direction.x * speed * dt;
          cursor.y += direction.y * speed * dt;
        }
        cursor.x = clamp(cursor.x, 46, ARENA.width - 46);
        if (playerId === 1) cursor.y = clamp(cursor.y, ARENA.riverBottom + 58, ARENA.height - 118);
        else cursor.y = clamp(cursor.y, 118, ARENA.riverTop - 58);
        cursor.valid = this.isPlacementValid(playerId, cursor.x, cursor.y);
      }
    }

    isPlacementValid(playerId, x, y) {
      if (x < 42 || x > ARENA.width - 42) return false;
      if (playerId === 1 && (y <= ARENA.riverBottom + 28 || y >= ARENA.height - 48)) return false;
      if (playerId === 2 && (y >= ARENA.riverTop - 28 || y <= 48)) return false;
      const ownTowers = this.towers.filter((tower) => tower.playerId === playerId && tower.alive);
      if (ownTowers.some((tower) => distanceXY(x, y, tower.x, tower.y) < tower.radius + 36)) return false;
      return true;
    }

    deploySelected(playerId) {
      if (!this.running || this.paused || this.ended) return;
      const player = this.players[playerId];
      const cursor = this.cursors[playerId];
      const cardId = player.hand[player.selectedIndex];
      const card = getCard(cardId);
      if (!card) return;
      if (!cursor.valid || !this.isPlacementValid(playerId, cursor.x, cursor.y)) {
        toast('Posição inválida', 'A carta deve nascer no seu próprio território.');
        sound.tone({ frequency: 160, end: 95, duration: 0.14, type: 'square', volume: 0.08 });
        return;
      }
      if (player.elixir + 0.001 < card.cost) {
        toast('Sem elixir', `Você precisa de ${card.cost} de elixir.`);
        sound.tone({ frequency: 180, end: 120, duration: 0.16, type: 'square', volume: 0.07 });
        return;
      }
      player.elixir -= card.cost;
      player.deployments += 1;
      const lane = cursor.x < ARENA.width / 2 ? 'left' : 'right';
      this.deployCard(card, playerId, lane, cursor.x, cursor.y);
      this.cycleHand(playerId, player.selectedIndex);
      sound.deploy();
      this.addRing(cursor.x, cursor.y, PLAYER[playerId].color, 82, 0.45);
      this.spawnParticles(cursor.x, cursor.y, PLAYER[playerId].light, 16, 110, 0.45);
      this.updateHud(true);
    }

    cycleHand(playerId, usedIndex) {
      const player = this.players[playerId];
      const used = player.hand[usedIndex];
      const next = player.queue.shift();
      if (next) {
        player.hand[usedIndex] = next;
        player.queue.push(used);
      }
      player.selectedIndex = clamp(player.selectedIndex, 0, player.hand.length - 1);
      this.renderHand(playerId);
    }

    deployCard(card, playerId, lane, x, y) {
      if (card.family) {
        const offsets = [
          { x: -28, y: 4, role: 'adult', scale: 0.96, ranged: false },
          { x: 28, y: 4, role: 'adult', scale: 0.96, ranged: false },
          { x: 0, y: playerId === 1 ? 34 : -34, role: 'child', scale: 0.78, ranged: true }
        ];
        offsets.forEach((offset, index) => {
          this.spawnUnit(card, playerId, lane, x + offset.x, y + offset.y, {
            hpMultiplier: index === 2 ? 0.48 : 0.6,
            damageMultiplier: index === 2 ? 0.62 : 0.72,
            radiusMultiplier: offset.scale,
            variant: offset.role,
            range: offset.ranged ? 170 : card.range,
            projectileSpeed: offset.ranged ? 470 : null,
            attack: offset.ranged ? 'slingshot' : 'family'
          });
        });
        this.announce('FAMÍLIA NA ARENA!', 0.75);
        return;
      }
      const unit = this.spawnUnit(card, playerId, lane, x, y);
      if (card.id === 'kaue-emo') {
        const summons = [
          { kind: 'hen', x: -30, y: 24 },
          { kind: 'hen', x: 30, y: 24 },
          { kind: 'rooster', x: 0, y: playerId === 1 ? 44 : -44 }
        ];
        summons.forEach((summon) => this.spawnAnimalToken(summon.kind, card, playerId, lane, x + summon.x, y + summon.y));
        this.announce('GALINHEIRO!', 0.7);
      }
      if (card.effects?.confuseOnDeploy) {
        this.units
          .filter((enemy) => enemy.alive && enemy.playerId !== playerId && distance(enemy, unit) <= 230)
          .forEach((enemy) => {
            enemy.confused = card.effects.confuseOnDeploy;
            this.addFloater(enemy.x, enemy.y - enemy.radius, 'CONFUSO', '#d98bff');
          });
        this.addRing(x, y, '#c84cff', 230, 0.75);
      }
    }

    spawnAnimalToken(kind, sourceCard, playerId, lane, x, y) {
      const rooster = kind === 'rooster';
      const token = {
        id: uid(kind),
        type: 'unit',
        cardId: sourceCard.id,
        name: rooster ? 'Galo' : 'Galinha',
        short: rooster ? 'Galo' : 'Galinha',
        playerId,
        lane,
        x,
        y,
        hp: rooster ? 370 : 250,
        maxHp: rooster ? 370 : 250,
        damage: rooster ? 88 : 54,
        speed: rooster ? 91 : 98,
        range: 34,
        attackRate: rooster ? 0.8 : 0.68,
        sight: 230,
        radius: rooster ? 20 : 17,
        targetMode: 'units',
        attackKind: rooster ? 'rooster' : 'hen',
        alive: true,
        state: 'spawn',
        spawnScale: 0.15,
        targetId: null,
        cooldown: randomRange(0.08, 0.3),
        hitFlash: 0,
        attackAnim: 0,
        attackAnimDuration: 0.28,
        facing: playerId === 1 ? -Math.PI / 2 : Math.PI / 2,
        crossedRiver: false,
        bridgeStage: 0,
        generatorTimer: 999,
        confused: 0,
        slowFactor: 1,
        slowTimer: 0,
        dotEffects: [],
        enraged: false,
        deathTimer: 0,
        variant: kind,
        projectileSpeed: null,
        damageMultiplier: 1,
        sourceCard: sourceCard.id,
        visualSeed: Math.random() * 10
      };
      this.units.push(token);
      return token;
    }

    spawnUnit(card, playerId, lane, x, y, options = {}) {
      const unit = {
        id: uid('unit'),
        type: 'unit',
        cardId: card.id,
        name: card.name,
        short: card.short,
        playerId,
        lane,
        x,
        y,
        hp: Math.round(card.hp * (options.hpMultiplier || 1)),
        maxHp: Math.round(card.hp * (options.hpMultiplier || 1)),
        damage: Math.round(card.damage * (options.damageMultiplier || 1)),
        speed: card.speed,
        range: options.range ?? card.range,
        attackRate: card.attackRate,
        sight: card.sight,
        radius: card.radius * (options.radiusMultiplier || 1),
        targetMode: card.target,
        attackKind: options.attack || card.attack,
        alive: true,
        state: 'spawn',
        spawnScale: 0.15,
        targetId: null,
        cooldown: randomRange(0.05, 0.26),
        hitFlash: 0,
        attackAnim: 0,
        attackAnimDuration: this.attackAnimationDuration(options.attack || card.attack),
        facing: playerId === 1 ? -Math.PI / 2 : Math.PI / 2,
        crossedRiver: false,
        bridgeStage: 0,
        generatorTimer: card.effects?.elixirEvery || 999,
        confused: 0,
        slowFactor: 1,
        slowTimer: 0,
        dotEffects: [],
        enraged: false,
        deathTimer: 0,
        variant: options.variant || 'main',
        projectileSpeed: options.projectileSpeed || card.effects?.projectileSpeed || null,
        damageMultiplier: 1,
        sourceCard: card.id,
        visualSeed: Math.random() * 10
      };
      this.units.push(unit);
      return unit;
    }

    attackAnimationDuration(kind) {
      const durations = {
        chaos: 0.36,
        kingpunch: 0.44,
        thai: 0.34,
        bomb: 0.55,
        milk: 0.4,
        tax: 0.42,
        hoe: 0.5,
        guitar: 0.58,
        runner: 0.48,
        family: 0.32,
        slingshot: 0.42,
        melee: 0.32,
        hen: 0.25,
        rooster: 0.3
      };
      return durations[kind] || 0.34;
    }

    loop(timestamp) {
      if (!this.running) return;
      const rawDt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;
      const dt = clamp(rawDt, 0, 0.045);
      if (!this.paused && !this.ended) this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(this.loop);
    }

    update(dt) {
      this.elapsed += dt;
      this.updateMatchTime(dt);
      this.updateAnnouncement(dt);
      this.updateCursorMovement(dt);
      this.updateElixir(dt);
      this.updateEffects(dt);
      this.updateUnits(dt);
      this.updateTowers(dt);
      this.updateProjectiles(dt);
      this.updateParticles(dt);
      this.resolveUnitSeparation(dt);
      this.cleanEntities();
      this.updateHud();
      this.shake = Math.max(0, this.shake - dt * 15);
    }

    updateMatchTime(dt) {
      if (!this.overtime) {
        this.timeLeft -= dt;
        if (!this.doubleElixir && this.timeLeft <= 60) {
          this.doubleElixir = true;
          this.announce('ELIXIR DUPLO!', 1.05);
          announcer.speak('Elixir duplo!', true);
        }
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          const crowns1 = this.players[1].crowns;
          const crowns2 = this.players[2].crowns;
          if (crowns1 !== crowns2) {
            this.endGame(crowns1 > crowns2 ? 1 : 2, 'Mais torres destruídas');
            return;
          }
          this.overtime = true;
          this.overtimeLeft = 60;
          this.doubleElixir = true;
          this.announce('MORTE SÚBITA!', 1.25);
          announcer.speak('Morte súbita!', true);
        }
      } else {
        this.overtimeLeft -= dt;
        if (this.overtimeLeft <= 0) {
          this.overtimeLeft = 0;
          const health1 = this.totalTowerHealth(1);
          const health2 = this.totalTowerHealth(2);
          if (Math.abs(health1 - health2) < 1) this.endGame(0, 'Empate perfeito');
          else this.endGame(health1 > health2 ? 1 : 2, 'Maior vida restante nas torres');
        }
      }
    }

    updateElixir(dt) {
      const rate = this.doubleElixir ? 0.72 : 0.36;
      for (const playerId of [1, 2]) {
        const player = this.players[playerId];
        player.elixir = clamp(player.elixir + rate * dt, 0, player.maxElixir);
      }
    }

    totalTowerHealth(playerId) {
      return this.towers
        .filter((tower) => tower.playerId === playerId)
        .reduce((sum, tower) => sum + Math.max(0, tower.hp), 0);
    }

    updateEffects(dt) {
      this.effects.forEach((effect) => {
        effect.remaining -= dt;
      });
      this.effects = this.effects.filter((effect) => effect.remaining > 0);
    }

    updateUnits(dt) {
      for (const unit of this.units) {
        if (!unit.alive) {
          unit.deathTimer -= dt;
          continue;
        }
        unit.spawnScale = Math.min(1, unit.spawnScale + dt * 5.4);
        unit.cooldown -= dt;
        unit.hitFlash = Math.max(0, unit.hitFlash - dt * 5.5);
        unit.attackAnim = Math.max(0, unit.attackAnim - dt);
        unit.confused = Math.max(0, unit.confused - dt);
        if (unit.slowTimer > 0) {
          unit.slowTimer -= dt;
          if (unit.slowTimer <= 0) unit.slowFactor = 1;
        }
        this.updateDots(unit, dt);
        this.updateGenerator(unit, dt);
        this.updateEnrage(unit);
        if (!unit.alive) continue;
        let target = this.getDamageable(unit.targetId);
        if (!target || !target.alive || !this.isValidTargetForUnit(unit, target)) {
          unit.targetId = null;
          target = null;
        }
        if (unit.targetMode !== 'buildings') {
          const nearbyEnemy = this.findNearbyEnemyUnit(unit);
          if (nearbyEnemy && (!target || target.type === 'tower' || distance(unit, nearbyEnemy) + 18 < distance(unit, target))) {
            target = nearbyEnemy;
            unit.targetId = nearbyEnemy.id;
          }
        }
        if (!target) {
          target = this.findTargetForUnit(unit);
          unit.targetId = target?.id || null;
        }
        if (!target) {
          unit.state = 'moving';
          const fallback = this.getFallbackTower(unit);
          if (fallback) this.moveUnitToward(unit, fallback, dt);
          continue;
        }
        const targetDistance = distance(unit, target);
        const attackRange = unit.range + (target.radius || 0) + unit.radius * 0.15;
        if (targetDistance <= attackRange) {
          unit.state = 'attacking';
          unit.facing = Math.atan2(target.y - unit.y, target.x - unit.x);
          if (unit.cooldown <= 0) this.performAttack(unit, target);
        } else {
          unit.state = 'moving';
          this.moveUnitToward(unit, target, dt);
        }
      }
    }

    updateDots(unit, dt) {
      if (!unit.dotEffects?.length) return;
      for (const dot of unit.dotEffects) {
        dot.remaining -= dt;
        dot.tick -= dt;
        if (dot.tick <= 0 && unit.alive) {
          dot.tick += 0.48;
          this.damageEntity(unit, dot.damage, dot.sourcePlayerId, { color: '#f7f3de', kind: 'milk-dot', silent: true });
          this.addFloater(unit.x, unit.y - unit.radius, `-${Math.round(dot.damage)}`, '#fff8dc', 0.5);
        }
      }
      unit.dotEffects = unit.dotEffects.filter((dot) => dot.remaining > 0);
    }

    updateGenerator(unit, dt) {
      const card = getCard(unit.cardId);
      const every = card?.effects?.elixirEvery;
      if (!every || !unit.alive) return;
      unit.generatorTimer -= dt;
      if (unit.generatorTimer <= 0) {
        unit.generatorTimer += every;
        const player = this.players[unit.playerId];
        player.elixir = clamp(player.elixir + (card.effects.elixirAmount || 0.5), 0, player.maxElixir);
        this.addRing(unit.x, unit.y, '#bd52ff', 50, 0.5);
        this.addFloater(unit.x, unit.y - unit.radius - 12, '+ ELIXIR', '#d785ff', 0.8);
        sound.tone({ frequency: 420, end: 680, duration: 0.16, type: 'triangle', volume: 0.06 });
      }
    }

    updateEnrage(unit) {
      const card = getCard(unit.cardId);
      const threshold = card?.effects?.enrageAt;
      if (!threshold || unit.enraged) return;
      if (unit.hp / unit.maxHp <= threshold) {
        unit.enraged = true;
        unit.damageMultiplier *= card.effects.enrageDamage || 1.4;
        unit.speed *= card.effects.enrageSpeed || 1.18;
        this.addRing(unit.x, unit.y, '#ffd247', 90, 0.75);
        this.addFloater(unit.x, unit.y - unit.radius, 'ENERGIZADO!', '#ffd247', 1);
        sound.tone({ frequency: 240, end: 610, duration: 0.34, type: 'sawtooth', volume: 0.12 });
      }
    }

    getDamageable(id) {
      if (!id) return null;
      return this.units.find((unit) => unit.id === id)
        || this.towers.find((tower) => tower.id === id)
        || null;
    }

    isValidTargetForUnit(unit, target) {
      if (!target.alive || target.playerId === unit.playerId) return false;
      if (unit.targetMode === 'buildings') return target.type === 'tower';
      return target.type === 'unit' || target.type === 'tower';
    }

    findNearbyEnemyUnit(unit) {
      const enemies = this.units.filter((enemy) => {
        if (!enemy.alive || enemy.playerId === unit.playerId) return false;
        const d = distance(unit, enemy);
        if (d > unit.sight) return false;
        if (this.areSeparatedByWater(unit, enemy) && !this.targetIsOnUsableBridge(enemy)) return false;
        return true;
      });
      enemies.sort((a, b) => {
        const distanceDiff = distance(unit, a) - distance(unit, b);
        const threatA = a.targetId === unit.id ? -36 : 0;
        const threatB = b.targetId === unit.id ? -36 : 0;
        return distanceDiff + threatA - threatB;
      });
      return enemies[0] || null;
    }

    findTargetForUnit(unit) {
      if (unit.targetMode !== 'buildings') {
        const enemy = this.findNearbyEnemyUnit(unit);
        if (enemy) return enemy;
      }
      return this.getFallbackTower(unit);
    }

    getFallbackTower(unit) {
      const enemyId = unit.playerId === 1 ? 2 : 1;
      const laneTower = this.towers.find((tower) => tower.playerId === enemyId && tower.kind === 'princess' && tower.lane === unit.lane && tower.alive);
      if (laneTower) return laneTower;
      const otherLane = unit.lane === 'left' ? 'right' : 'left';
      const otherTower = this.towers.find((tower) => tower.playerId === enemyId && tower.kind === 'princess' && tower.lane === otherLane && tower.alive);
      const king = this.towers.find((tower) => tower.playerId === enemyId && tower.kind === 'king' && tower.alive);
      if (unit.targetMode === 'buildings') return laneTower || king || otherTower || null;
      if (king && this.hasCrossedTowardEnemy(unit)) return king;
      return laneTower || otherTower || king || null;
    }

    hasCrossedTowardEnemy(unit) {
      return unit.playerId === 1 ? unit.y < ARENA.riverTop : unit.y > ARENA.riverBottom;
    }

    areSeparatedByWater(a, b) {
      const aTop = a.y < ARENA.riverTop;
      const aBottom = a.y > ARENA.riverBottom;
      const bTop = b.y < ARENA.riverTop;
      const bBottom = b.y > ARENA.riverBottom;
      return (aTop && bBottom) || (aBottom && bTop);
    }

    targetIsOnUsableBridge(target) {
      if (target.y < ARENA.riverTop - 10 || target.y > ARENA.riverBottom + 10) return false;
      return this.isInsideBridge(target.x);
    }

    isInsideBridge(x) {
      return ARENA.bridgeCenters.some((center) => Math.abs(x - center) <= ARENA.bridgeWidth / 2 - 8);
    }

    getBridgeX(unit, target = null) {
      if (unit.lane === 'left') return ARENA.bridgeCenters[0];
      if (unit.lane === 'right') return ARENA.bridgeCenters[1];
      const referenceX = target?.x ?? unit.x;
      return Math.abs(referenceX - ARENA.bridgeCenters[0]) < Math.abs(referenceX - ARENA.bridgeCenters[1])
        ? ARENA.bridgeCenters[0]
        : ARENA.bridgeCenters[1];
    }

    needsBridge(unit, target) {
      if (!target) return false;
      return this.areSeparatedByWater(unit, target);
    }

    navigationGoal(unit, target) {
      const bridgeX = this.getBridgeX(unit, target);
      const topEntry = ARENA.riverTop - 18;
      const bottomEntry = ARENA.riverBottom + 18;
      if (!this.needsBridge(unit, target)) return { x: target.x, y: target.y };
      if (unit.playerId === 1) {
        if (unit.y > bottomEntry + 4) return { x: bridgeX, y: bottomEntry };
        if (unit.y >= topEntry - 3) return { x: bridgeX, y: topEntry };
        return { x: target.x, y: target.y };
      }
      if (unit.y < topEntry - 4) return { x: bridgeX, y: topEntry };
      if (unit.y <= bottomEntry + 3) return { x: bridgeX, y: bottomEntry };
      return { x: target.x, y: target.y };
    }

    moveUnitToward(unit, target, dt) {
      const goal = this.navigationGoal(unit, target);
      let direction = normalize(goal.x - unit.x, goal.y - unit.y);
      if (unit.confused > 0) {
        const wobble = Math.sin(this.elapsed * 8 + unit.visualSeed) * 0.55;
        const cos = Math.cos(wobble);
        const sin = Math.sin(wobble);
        direction = { x: direction.x * cos - direction.y * sin, y: direction.x * sin + direction.y * cos };
      }
      unit.facing = Math.atan2(direction.y, direction.x);
      const slow = unit.slowFactor || 1;
      const moveDistance = unit.speed * slow * dt;
      let nextX = unit.x + direction.x * moveDistance;
      let nextY = unit.y + direction.y * moveDistance;
      const constrained = this.constrainMovementToBridges(unit, nextX, nextY, target);
      unit.x = clamp(constrained.x, unit.radius + 8, ARENA.width - unit.radius - 8);
      unit.y = clamp(constrained.y, unit.radius + 8, ARENA.height - unit.radius - 8);
    }

    constrainMovementToBridges(unit, nextX, nextY, target) {
      const inRiverY = nextY > ARENA.riverTop && nextY < ARENA.riverBottom;
      if (!inRiverY || this.isInsideBridge(nextX)) return { x: nextX, y: nextY };
      const bridgeX = this.getBridgeX(unit, target);
      const edgeY = unit.y >= ARENA.riverBottom ? ARENA.riverBottom + 1 : unit.y <= ARENA.riverTop ? ARENA.riverTop - 1 : unit.y;
      const horizontalStep = clamp(bridgeX - unit.x, -Math.abs(nextY - unit.y) - 7, Math.abs(nextY - unit.y) + 7);
      return {
        x: unit.x + horizontalStep,
        y: edgeY
      };
    }

    resolveUnitSeparation(dt) {
      const alive = this.units.filter((unit) => unit.alive);
      for (let i = 0; i < alive.length; i += 1) {
        const a = alive[i];
        for (let j = i + 1; j < alive.length; j += 1) {
          const b = alive[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.001;
          const onBridge = (a.y > ARENA.riverTop - 25 && a.y < ARENA.riverBottom + 25)
            || (b.y > ARENA.riverTop - 25 && b.y < ARENA.riverBottom + 25);
          const desired = (a.radius + b.radius) * (onBridge ? 0.42 : 0.66);
          if (d >= desired) continue;
          const push = (desired - d) * 0.5 * Math.min(1, dt * 25);
          const nx = dx / d;
          const ny = dy / d;
          if (onBridge) {
            a.x -= nx * push * 0.35;
            b.x += nx * push * 0.35;
          } else {
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
    }

    performAttack(unit, target) {
      const card = getCard(unit.cardId);
      unit.cooldown = Math.max(0.22, unit.attackRate / (unit.enraged ? 1.12 : 1));
      unit.attackAnim = unit.attackAnimDuration;
      const kind = unit.attackKind;
      const effects = card?.effects || {};
      let damage = unit.damage * unit.damageMultiplier;
      let missChance = effects.missChance || 0;
      let critChance = effects.critChance || 0;
      let critMultiplier = effects.critMultiplier || 1.7;
      if (unit.enraged && card?.id === 'jaimes-agricultor') missChance += effects.enrageMiss || 0;
      const roll = Math.random();
      if (roll < missChance) {
        this.addFloater(target.x, target.y - (target.radius || 30), 'ERROU!', '#e6e8ef', 0.7);
        this.addAttackVisual(unit, target, kind, false, false);
        sound.hit(kind);
        return;
      }
      const critical = Math.random() < critChance;
      if (critical) damage *= critMultiplier;

      if (kind === 'bomb') {
        this.explodeUnit(unit, damage, effects.splash || 150, '#ff8a36');
        return;
      }
      if (kind === 'runner') {
        this.damageEntity(target, damage, unit.playerId, { kind, color: '#fff0a0', critical: true });
        this.explodeUnit(unit, damage * 0.22, effects.splash || 70, '#ffd45f', target.id);
        this.addAttackVisual(unit, target, kind, true, true);
        return;
      }
      if (kind === 'milk' || kind === 'tax' || kind === 'slingshot') {
        this.createProjectile(unit, target, damage, kind, critical);
        this.addAttackVisual(unit, target, kind, true, critical);
        sound.hit(kind);
        return;
      }

      this.damageEntity(target, damage, unit.playerId, { kind, color: critical ? '#ffe06a' : this.attackColor(kind), critical });
      this.addAttackVisual(unit, target, kind, true, critical);
      sound.hit(kind);

      if (kind === 'kingpunch') {
        this.knockbackTarget(unit, target, effects.knockback || 42);
        target.stunTimer = Math.max(target.stunTimer || 0, effects.stun || 0.15);
      }
      if (kind === 'guitar') {
        this.damageSplash(target.x, target.y, effects.splash || 80, damage * 0.32, unit.playerId, target.id, '#8058ff');
        this.knockbackTarget(unit, target, effects.knockback || 30);
      }
      if (kind === 'hoe' && unit.enraged) {
        this.damageSplash(target.x, target.y, 70, damage * 0.22, unit.playerId, target.id, '#ffd34f');
      }
      if (kind === 'chaos' && critical) {
        target.confused = Math.max(target.confused || 0, 1.5);
      }
    }

    attackColor(kind) {
      const colors = {
        chaos: '#d460ff',
        kingpunch: '#ffcc58',
        thai: '#ffb13f',
        family: '#6dc8ff',
        melee: '#ffffff',
        hoe: '#77e274',
        guitar: '#a487ff',
        hen: '#ffdb75',
        rooster: '#ff6b4d'
      };
      return colors[kind] || '#ffffff';
    }

    createProjectile(unit, target, damage, kind, critical) {
      const speed = unit.projectileSpeed || (kind === 'milk' ? 390 : 470);
      this.projectiles.push({
        id: uid('projectile'),
        x: unit.x,
        y: unit.y,
        sourceId: unit.id,
        sourcePlayerId: unit.playerId,
        targetId: target.id,
        damage,
        kind,
        critical,
        speed,
        radius: kind === 'milk' ? 10 : kind === 'tax' ? 8 : 6,
        alive: true,
        trail: []
      });
    }

    updateProjectiles(dt) {
      for (const projectile of this.projectiles) {
        if (!projectile.alive) continue;
        const target = this.getDamageable(projectile.targetId);
        if (!target || !target.alive) {
          projectile.alive = false;
          continue;
        }
        projectile.trail.push({ x: projectile.x, y: projectile.y, life: 0.22 });
        if (projectile.trail.length > 8) projectile.trail.shift();
        projectile.trail.forEach((point) => { point.life -= dt; });
        projectile.trail = projectile.trail.filter((point) => point.life > 0);
        const direction = normalize(target.x - projectile.x, target.y - projectile.y);
        projectile.x += direction.x * projectile.speed * dt;
        projectile.y += direction.y * projectile.speed * dt;
        const hitDistance = (target.radius || 20) + projectile.radius + 4;
        if (distance(projectile, target) <= hitDistance) {
          projectile.alive = false;
          this.damageEntity(target, projectile.damage, projectile.sourcePlayerId, {
            kind: projectile.kind,
            color: projectile.kind === 'milk' ? '#fff7df' : projectile.kind === 'tax' ? '#c766ff' : '#ffd46f',
            critical: projectile.critical
          });
          if (projectile.kind === 'milk' && target.type === 'unit') {
            const card = getCard('goblin-do-leite');
            target.slowFactor = Math.min(target.slowFactor || 1, card.effects.slow || 0.5);
            target.slowTimer = Math.max(target.slowTimer || 0, card.effects.slowDuration || 2.6);
            target.dotEffects.push({
              remaining: card.effects.dotDuration || 3,
              tick: 0.46,
              damage: card.effects.dot || 34,
              sourcePlayerId: projectile.sourcePlayerId
            });
            this.addRing(target.x, target.y, '#fff5da', 55, 0.45);
          }
          this.spawnParticles(target.x, target.y, projectile.kind === 'milk' ? '#fff8df' : '#c563ff', 10, 90, 0.35);
        }
      }
    }

    addAttackVisual(unit, target, kind, connected, critical) {
      const color = critical ? '#ffe65f' : this.attackColor(kind);
      if (kind === 'chaos') {
        this.rings.push({ type: 'slash', x: target.x, y: target.y, color, radius: 52, life: 0.34, maxLife: 0.34, rotation: randomRange(-1, 1) });
        this.rings.push({ type: 'slash', x: target.x, y: target.y, color: '#8758ff', radius: 44, life: 0.3, maxLife: 0.3, rotation: randomRange(0.5, 2) });
      } else if (kind === 'kingpunch') {
        this.rings.push({ type: 'punch', x: target.x, y: target.y, color, radius: 76, life: 0.42, maxLife: 0.42, rotation: unit.facing });
      } else if (kind === 'thai') {
        this.rings.push({ type: 'arc', x: target.x, y: target.y, color, radius: critical ? 86 : 58, life: 0.36, maxLife: 0.36, rotation: unit.facing });
      } else if (kind === 'guitar') {
        this.rings.push({ type: 'shockwave', x: target.x, y: target.y, color, radius: 98, life: 0.5, maxLife: 0.5, rotation: 0 });
      } else if (kind === 'hoe') {
        this.rings.push({ type: 'hoe', x: target.x, y: target.y, color, radius: 70, life: 0.44, maxLife: 0.44, rotation: unit.facing });
      } else if (kind === 'runner') {
        this.rings.push({ type: 'impact', x: target.x, y: target.y, color, radius: 110, life: 0.5, maxLife: 0.5, rotation: 0 });
      } else if (kind === 'family' || kind === 'melee' || kind === 'hen' || kind === 'rooster') {
        this.rings.push({ type: 'hit', x: target.x, y: target.y, color, radius: 42, life: 0.24, maxLife: 0.24, rotation: unit.facing });
      }
      if (connected) this.spawnParticles(target.x, target.y, color, critical ? 18 : 9, critical ? 160 : 90, 0.36);
    }

    explodeUnit(unit, damage, radius, color, ignoreId = null) {
      sound.explosion();
      this.shake = Math.max(this.shake, 12);
      this.rings.push({ type: 'explosion', x: unit.x, y: unit.y, color, radius, life: 0.62, maxLife: 0.62, rotation: 0 });
      this.spawnParticles(unit.x, unit.y, color, 34, 220, 0.75);
      const targets = [
        ...this.units.filter((target) => target.alive && target.playerId !== unit.playerId && target.id !== ignoreId),
        ...this.towers.filter((target) => target.alive && target.playerId !== unit.playerId && target.id !== ignoreId)
      ];
      targets.forEach((target) => {
        const d = distance(unit, target);
        if (d <= radius + (target.radius || 0)) {
          const falloff = 1 - clamp(d / (radius + (target.radius || 0)), 0, 0.65);
          this.damageEntity(target, damage * falloff, unit.playerId, { kind: 'explosion', color });
        }
      });
      this.killUnit(unit, unit.playerId, true);
    }

    damageSplash(x, y, radius, damage, sourcePlayerId, ignoreId, color) {
      this.units
        .filter((target) => target.alive && target.playerId !== sourcePlayerId && target.id !== ignoreId)
        .forEach((target) => {
          if (distanceXY(x, y, target.x, target.y) <= radius + target.radius) {
            this.damageEntity(target, damage, sourcePlayerId, { kind: 'splash', color, silent: true });
          }
        });
      this.addRing(x, y, color, radius, 0.38);
    }

    knockbackTarget(source, target, amount) {
      if (target.type !== 'unit' || !target.alive) return;
      const direction = normalize(target.x - source.x, target.y - source.y);
      let nextX = target.x + direction.x * amount;
      let nextY = target.y + direction.y * amount;
      const constrained = this.constrainMovementToBridges(target, nextX, nextY, source);
      target.x = clamp(constrained.x, target.radius + 8, ARENA.width - target.radius - 8);
      target.y = clamp(constrained.y, target.radius + 8, ARENA.height - target.radius - 8);
    }

    damageEntity(target, rawDamage, sourcePlayerId, options = {}) {
      if (!target?.alive || rawDamage <= 0) return;
      const damage = Math.max(1, Math.round(rawDamage));
      target.hp -= damage;
      target.hitFlash = 1;
      if (target.type === 'tower' && target.kind === 'king') target.active = true;
      if (!options.silent) {
        this.addFloater(target.x, target.y - (target.radius || 30), `${options.critical ? 'CRÍTICO ' : ''}-${damage}`, options.color || '#ffffff', options.critical ? 0.85 : 0.58);
      }
      if (target.hp <= 0) {
        target.hp = 0;
        if (target.type === 'unit') this.killUnit(target, sourcePlayerId);
        else this.destroyTower(target, sourcePlayerId);
      }
    }

    killUnit(unit, sourcePlayerId, silent = false) {
      if (!unit.alive) return;
      unit.alive = false;
      unit.deathTimer = 0.42;
      unit.targetId = null;
      if (!silent) {
        this.spawnParticles(unit.x, unit.y, PLAYER[unit.playerId].light, 12, 120, 0.45);
        this.addRing(unit.x, unit.y, PLAYER[unit.playerId].color, unit.radius + 24, 0.34);
      }
    }

    destroyTower(tower, attackerId) {
      if (!tower.alive) return;
      tower.alive = false;
      tower.deathTimer = 1;
      tower.targetId = null;
      sound.towerDestroyed();
      this.shake = Math.max(this.shake, tower.kind === 'king' ? 22 : 14);
      this.spawnParticles(tower.x, tower.y, '#d7b56a', tower.kind === 'king' ? 48 : 34, 240, 1.1);
      this.rings.push({ type: 'explosion', x: tower.x, y: tower.y, color: '#ffb13a', radius: tower.kind === 'king' ? 190 : 135, life: 0.9, maxLife: 0.9, rotation: 0 });
      const attacker = this.players[attackerId];
      if (attacker && !attacker.destroyed.includes(tower.id)) {
        attacker.destroyed.push(tower.id);
        if (tower.kind === 'king') attacker.crowns = 3;
        else attacker.crowns = Math.min(2, attacker.crowns + 1);
      }
      if (tower.kind === 'princess') {
        const king = this.towers.find((candidate) => candidate.playerId === tower.playerId && candidate.kind === 'king');
        if (king) king.active = true;
      }
      this.updateHud(true);
      if (tower.kind === 'king') {
        this.announce('TORRE DO REI DESTRUÍDA!', 1.5);
        announcer.speak(`Jogador ${attackerId} venceu. Torre do Rei destruída!`, true);
        this.endGame(attackerId, 'Torre do Rei destruída — vitória de três coroas');
        return;
      }
      this.announce(`TORRE DO J${tower.playerId} CAIU!`, 1);
      announcer.speak(`Torre do jogador ${tower.playerId} destruída!`, true);
      if (this.overtime) this.endGame(attackerId, 'Primeira torre destruída na morte súbita');
    }

    updateTowers(dt) {
      for (const tower of this.towers) {
        if (!tower.alive) {
          tower.deathTimer = Math.max(0, tower.deathTimer - dt);
          continue;
        }
        tower.cooldown -= dt;
        tower.hitFlash = Math.max(0, tower.hitFlash - dt * 5);
        tower.activationPulse = Math.max(0, tower.activationPulse - dt * 2.2);
        if (tower.kind === 'king' && !tower.active) continue;
        let target = this.getDamageable(tower.targetId);
        if (!target || !target.alive || target.type !== 'unit' || target.playerId === tower.playerId || distance(tower, target) > tower.range + target.radius) {
          target = this.findTowerTarget(tower);
          tower.targetId = target?.id || null;
        }
        if (target && tower.cooldown <= 0) {
          tower.cooldown = tower.attackRate;
          this.projectiles.push({
            id: uid('tower-shot'),
            x: tower.x,
            y: tower.y - 8,
            sourceId: tower.id,
            sourcePlayerId: tower.playerId,
            targetId: target.id,
            damage: tower.damage,
            kind: tower.kind === 'king' ? 'king-shot' : 'tower-shot',
            critical: false,
            speed: tower.kind === 'king' ? 560 : 520,
            radius: tower.kind === 'king' ? 9 : 7,
            alive: true,
            trail: []
          });
          sound.towerShot();
        }
      }
    }

    findTowerTarget(tower) {
      const enemies = this.units.filter((unit) => unit.alive && unit.playerId !== tower.playerId && distance(tower, unit) <= tower.range + unit.radius);
      enemies.sort((a, b) => distance(tower, a) - distance(tower, b));
      return enemies[0] || null;
    }

    cleanEntities() {
      this.units = this.units.filter((unit) => unit.alive || unit.deathTimer > 0);
      this.projectiles = this.projectiles.filter((projectile) => projectile.alive);
      this.particles = this.particles.filter((particle) => particle.life > 0);
      this.rings = this.rings.filter((ring) => ring.life > 0);
      this.floaters = this.floaters.filter((floater) => floater.life > 0);
    }

    endGame(winnerId, reason) {
      if (this.ended) return;
      this.ended = true;
      this.running = true;
      if (winnerId) sound.victory();
      window.setTimeout(() => {
        displayResult({
          winnerId,
          reason,
          crowns: { 1: this.players[1].crowns, 2: this.players[2].crowns }
        });
      }, 700);
    }

    spawnParticles(x, y, color, count = 10, speed = 100, life = 0.45) {
      for (let index = 0; index < count; index += 1) {
        const angle = randomRange(0, Math.PI * 2);
        const velocity = randomRange(speed * 0.35, speed);
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          gravity: randomRange(40, 110),
          color,
          size: randomRange(2.5, 7.5),
          life: randomRange(life * 0.55, life),
          maxLife: life
        });
      }
    }

    addRing(x, y, color, radius, life = 0.4) {
      this.rings.push({ type: 'ring', x, y, color, radius, life, maxLife: life, rotation: 0 });
    }

    addFloater(x, y, text, color = '#ffffff', life = 0.65) {
      this.floaters.push({ x, y, text, color, life, maxLife: life });
    }

    updateParticles(dt) {
      this.particles.forEach((particle) => {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += particle.gravity * dt;
        particle.vx *= Math.pow(0.94, dt * 60);
      });
      this.rings.forEach((ring) => {
        ring.life -= dt;
        ring.rotation += dt * 3;
      });
      this.floaters.forEach((floater) => {
        floater.life -= dt;
        floater.y -= 42 * dt;
      });
    }

    draw() {
      const ctx = this.ctx;
      ctx.save();
      const shakeX = this.shake > 0 ? randomRange(-this.shake, this.shake) : 0;
      const shakeY = this.shake > 0 ? randomRange(-this.shake, this.shake) : 0;
      ctx.translate(shakeX, shakeY);
      this.drawArena(ctx);
      this.drawPlacementAreas(ctx);
      this.drawTowers(ctx);
      this.drawUnits(ctx);
      this.drawProjectiles(ctx);
      this.drawEffects(ctx);
      this.drawCursors(ctx);
      ctx.restore();
      if (this.paused) this.drawPauseTint(ctx);
    }

    drawArena(ctx) {
      ctx.fillStyle = '#335f2f';
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
      const tile = 42;
      for (let y = 0; y < ARENA.height; y += tile) {
        for (let x = 0; x < ARENA.width; x += tile) {
          const parity = ((x / tile) + (y / tile)) % 2;
          ctx.fillStyle = parity ? 'rgba(255,255,255,0.032)' : 'rgba(0,0,0,0.035)';
          ctx.fillRect(x, y, tile, tile);
        }
      }
      const centerGradient = ctx.createLinearGradient(0, 0, 0, ARENA.height);
      centerGradient.addColorStop(0, 'rgba(239,69,101,0.13)');
      centerGradient.addColorStop(0.42, 'rgba(239,69,101,0.02)');
      centerGradient.addColorStop(0.58, 'rgba(38,133,255,0.02)');
      centerGradient.addColorStop(1, 'rgba(38,133,255,0.13)');
      ctx.fillStyle = centerGradient;
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
      this.drawLanes(ctx);
      this.drawRiver(ctx);
      this.drawBridges(ctx);
      this.drawArenaBorder(ctx);
      this.drawTerritoryText(ctx);
    }

    drawLanes(ctx) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 221, 151, 0.08)';
      ctx.lineWidth = 34;
      ctx.lineCap = 'round';
      for (const x of ARENA.bridgeCenters) {
        ctx.beginPath();
        ctx.moveTo(x, 90);
        ctx.lineTo(x, ARENA.riverTop - 16);
        ctx.moveTo(x, ARENA.riverBottom + 16);
        ctx.lineTo(x, ARENA.height - 90);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawRiver(ctx) {
      const gradient = ctx.createLinearGradient(0, ARENA.riverTop, 0, ARENA.riverBottom);
      gradient.addColorStop(0, '#1477b8');
      gradient.addColorStop(0.45, '#209bdb');
      gradient.addColorStop(1, '#0e68a7');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, ARENA.riverTop, ARENA.width, ARENA.riverBottom - ARENA.riverTop);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let x = -20; x < ARENA.width + 40; x += 62) {
        const offset = Math.sin(this.elapsed * 1.7 + x * 0.02) * 8;
        ctx.beginPath();
        ctx.ellipse(x + offset, ARENA.riverTop + 22, 28, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(x - offset, ARENA.riverBottom - 22, 24, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(213,239,255,0.2)';
      ctx.lineWidth = 3;
      for (let row = 0; row < 3; row += 1) {
        ctx.beginPath();
        for (let x = 0; x <= ARENA.width; x += 20) {
          const y = ARENA.riverTop + 20 + row * 20 + Math.sin(x * 0.045 + this.elapsed * 2.2 + row) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(12,45,78,0.35)';
      ctx.fillRect(0, ARENA.riverTop - 7, ARENA.width, 7);
      ctx.fillRect(0, ARENA.riverBottom, ARENA.width, 7);
    }

    drawBridges(ctx) {
      for (const center of ARENA.bridgeCenters) {
        const width = ARENA.bridgeWidth;
        const x = center - width / 2;
        const y = ARENA.riverTop - 8;
        const height = ARENA.riverBottom - ARENA.riverTop + 16;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        roundRect(ctx, x - 7, y + 7, width + 14, height + 8, 8);
        ctx.fill();
        const wood = ctx.createLinearGradient(x, 0, x + width, 0);
        wood.addColorStop(0, '#8c5526');
        wood.addColorStop(0.5, '#c58a46');
        wood.addColorStop(1, '#7d4721');
        ctx.fillStyle = wood;
        ctx.strokeStyle = '#4c2a14';
        ctx.lineWidth = 5;
        roundRect(ctx, x, y, width, height, 7);
        ctx.fill();
        ctx.stroke();
        const plankHeight = 17;
        for (let py = y + 4; py < y + height - 2; py += plankHeight) {
          ctx.fillStyle = py % 34 < 17 ? 'rgba(255,226,160,0.11)' : 'rgba(0,0,0,0.07)';
          ctx.fillRect(x + 5, py, width - 10, plankHeight - 2);
          ctx.strokeStyle = 'rgba(65,35,15,0.58)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 4, py + plankHeight);
          ctx.lineTo(x + width - 4, py + plankHeight);
          ctx.stroke();
        }
        ctx.fillStyle = '#4d2c18';
        ctx.fillRect(x + 7, y, 8, height);
        ctx.fillRect(x + width - 15, y, 8, height);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(ARENA.width / 2, (ARENA.riverTop + ARENA.riverBottom) / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244,184,60,0.5)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.font = '900 22px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CPX', 0, 1);
      ctx.restore();
    }

    drawArenaBorder(ctx) {
      ctx.strokeStyle = '#d3a842';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, ARENA.width - 6, ARENA.height - 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(9, 9, ARENA.width - 18, ARENA.height - 18);
    }

    drawTerritoryText(ctx) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '900 18px Inter, sans-serif';
      ctx.fillStyle = 'rgba(239,69,101,0.14)';
      ctx.fillText('TERRITÓRIO DO JOGADOR 2', ARENA.width / 2, 340);
      ctx.fillStyle = 'rgba(38,133,255,0.14)';
      ctx.fillText('TERRITÓRIO DO JOGADOR 1', ARENA.width / 2, 740);
      ctx.restore();
    }

    drawPlacementAreas(ctx) {
      const pulse = 0.03 + (Math.sin(this.elapsed * 3) + 1) * 0.014;
      ctx.fillStyle = `rgba(239,69,101,${pulse})`;
      ctx.fillRect(12, 12, ARENA.width - 24, ARENA.riverTop - 28);
      ctx.fillStyle = `rgba(38,133,255,${pulse})`;
      ctx.fillRect(12, ARENA.riverBottom + 16, ARENA.width - 24, ARENA.height - ARENA.riverBottom - 28);
    }

    drawTowers(ctx) {
      const sorted = [...this.towers].sort((a, b) => a.y - b.y);
      sorted.forEach((tower) => {
        if (!tower.alive) {
          this.drawTowerRubble(ctx, tower);
          return;
        }
        const profile = PLAYER[tower.playerId];
        ctx.save();
        ctx.translate(tower.x, tower.y);
        const shadow = ctx.createRadialGradient(0, 22, 3, 0, 22, tower.radius * 1.5);
        shadow.addColorStop(0, 'rgba(0,0,0,0.42)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.ellipse(0, 25, tower.radius * 1.5, tower.radius * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        const body = ctx.createLinearGradient(-tower.radius, -tower.radius, tower.radius, tower.radius);
        body.addColorStop(0, tower.hitFlash > 0 ? '#ffffff' : profile.light);
        body.addColorStop(0.46, profile.color);
        body.addColorStop(1, profile.dark);
        ctx.fillStyle = body;
        ctx.strokeStyle = '#151b2a';
        ctx.lineWidth = 7;
        const size = tower.kind === 'king' ? 112 : 90;
        roundRect(ctx, -size / 2, -size / 2, size, size, tower.kind === 'king' ? 18 : 14);
        ctx.fill();
        ctx.stroke();
        const crownWidth = tower.kind === 'king' ? 92 : 74;
        ctx.fillStyle = '#e5bf67';
        ctx.strokeStyle = '#66451d';
        ctx.lineWidth = 5;
        roundRect(ctx, -crownWidth / 2, -size / 2 - 19, crownWidth, tower.kind === 'king' ? 40 : 32, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffe49c';
        const battlements = tower.kind === 'king' ? 5 : 4;
        for (let i = 0; i < battlements; i += 1) {
          const step = crownWidth / battlements;
          ctx.fillRect(-crownWidth / 2 + 4 + i * step, -size / 2 - 29, step - 8, 18);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = tower.kind === 'king' ? '900 38px Impact, sans-serif' : '900 29px Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tower.kind === 'king' ? '♛' : '♜', 0, 3);
        if (tower.kind === 'king' && !tower.active) {
          ctx.fillStyle = 'rgba(4,7,15,0.55)';
          roundRect(ctx, -size / 2 + 5, -size / 2 + 5, size - 10, size - 10, 14);
          ctx.fill();
          ctx.fillStyle = '#dce5ff';
          ctx.font = '900 15px Inter, sans-serif';
          ctx.fillText('DORMINDO', 0, 3);
        }
        ctx.restore();
        this.drawHealthBar(ctx, tower, tower.kind === 'king' ? 112 : 92, tower.radius + 38, profile.color);
      });
    }

    drawTowerRubble(ctx, tower) {
      ctx.save();
      ctx.translate(tower.x, tower.y);
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath();
      ctx.ellipse(0, 20, tower.radius * 1.4, tower.radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2;
        const d = 18 + (i % 4) * 10;
        ctx.save();
        ctx.translate(Math.cos(angle) * d, Math.sin(angle) * d * 0.55);
        ctx.rotate(angle + i * 0.4);
        ctx.fillStyle = i % 3 === 0 ? PLAYER[tower.playerId].dark : '#7a6a52';
        ctx.fillRect(-10, -7, 20, 14);
        ctx.restore();
      }
      ctx.restore();
    }

    drawUnits(ctx) {
      const sorted = [...this.units].sort((a, b) => a.y - b.y);
      sorted.forEach((unit) => this.drawUnit(ctx, unit));
    }

    drawUnit(ctx, unit) {
      if (!unit.alive && unit.deathTimer <= 0) return;
      const profile = PLAYER[unit.playerId];
      const deathProgress = unit.alive ? 0 : 1 - clamp(unit.deathTimer / 0.42, 0, 1);
      const attackProgress = unit.attackAnim > 0 ? 1 - unit.attackAnim / unit.attackAnimDuration : 0;
      const attackWave = unit.attackAnim > 0 ? Math.sin(attackProgress * Math.PI) : 0;
      const walkBob = unit.state === 'moving' ? Math.sin(this.elapsed * 11 + unit.visualSeed) * 2.5 : 0;
      let drawX = unit.x;
      let drawY = unit.y + walkBob;
      let rotation = 0;
      let scaleX = 1;
      let scaleY = 1;
      if (unit.attackAnim > 0) {
        const lunge = attackWave * Math.min(18, unit.radius * 0.55);
        drawX += Math.cos(unit.facing) * lunge;
        drawY += Math.sin(unit.facing) * lunge;
        if (['guitar', 'hoe', 'thai', 'kingpunch', 'chaos'].includes(unit.attackKind)) rotation = Math.sin(attackProgress * Math.PI * 2) * 0.12;
        scaleX += attackWave * 0.08;
        scaleY -= attackWave * 0.05;
      }
      if (unit.attackKind === 'runner' && unit.state === 'moving') {
        rotation = Math.sin(this.elapsed * 13) * 0.04;
        this.drawSpeedTrails(ctx, unit);
      }
      const spawnScale = unit.spawnScale * (1 - deathProgress * 0.75);
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(rotation);
      ctx.scale(spawnScale * scaleX, spawnScale * scaleY);
      ctx.globalAlpha = 1 - deathProgress;
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath();
      ctx.ellipse(0, unit.radius * 0.72, unit.radius * 1.05, unit.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (unit.enraged) {
        ctx.strokeStyle = '#ffd247';
        ctx.lineWidth = 6;
        ctx.globalAlpha = (1 - deathProgress) * (0.65 + Math.sin(this.elapsed * 9) * 0.18);
        ctx.beginPath();
        ctx.arc(0, 0, unit.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1 - deathProgress;
      }
      if (unit.slowTimer > 0) {
        ctx.strokeStyle = '#fff7df';
        ctx.lineWidth = 5;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, unit.radius + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (unit.variant === 'hen' || unit.variant === 'rooster') {
        this.drawAnimalUnit(ctx, unit, profile);
      } else {
        this.drawCardSprite(ctx, unit, profile);
        this.drawUnitWeapon(ctx, unit, attackWave);
      }
      ctx.restore();
      if (unit.alive) {
        this.drawHealthBar(ctx, unit, Math.max(58, unit.radius * 2.15), unit.radius + 30, profile.color);
        this.drawUnitName(ctx, unit);
      }
    }

    drawCardSprite(ctx, unit, profile) {
      const cardImage = assets.getCard(unit.cardId) || assets.getPortrait(unit.cardId);
      const width = unit.radius * 1.62;
      const height = unit.radius * 2.22;
      const radius = Math.max(8, unit.radius * 0.28);
      const border = unit.hitFlash > 0 ? '#ffffff' : profile.color;
      ctx.save();
      ctx.strokeStyle = '#080c16';
      ctx.lineWidth = 8;
      ctx.fillStyle = '#0a1020';
      roundRect(ctx, -width / 2, -height / 2, width, height, radius);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = border;
      ctx.lineWidth = 5;
      roundRect(ctx, -width / 2 + 2, -height / 2 + 2, width - 4, height - 4, radius - 2);
      ctx.stroke();
      ctx.save();
      roundRect(ctx, -width / 2 + 5, -height / 2 + 5, width - 10, height - 10, Math.max(6, radius - 4));
      ctx.clip();
      if (cardImage) {
        ctx.drawImage(cardImage, -width / 2 + 5, -height / 2 + 5, width - 10, height - 10);
      } else {
        const fallback = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
        fallback.addColorStop(0, profile.light);
        fallback.addColorStop(1, profile.dark);
        ctx.fillStyle = fallback;
        ctx.fillRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10);
      }
      const gloss = ctx.createLinearGradient(0, -height / 2, 0, 0);
      gloss.addColorStop(0, 'rgba(255,255,255,0.28)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss;
      ctx.fillRect(-width / 2 + 5, -height / 2 + 5, width - 10, height * 0.45);
      ctx.restore();
      if (unit.variant === 'child') {
        ctx.fillStyle = '#ffd66b';
        ctx.font = '900 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FILHO', 0, height / 2 + 13);
      }
      ctx.restore();
    }

    drawAnimalUnit(ctx, unit, profile) {
      ctx.save();
      const size = unit.radius * 2.1;
      ctx.fillStyle = unit.variant === 'rooster' ? '#7b3522' : '#c99a55';
      ctx.strokeStyle = profile.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 2, size * 0.42, size * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = unit.variant === 'rooster' ? '#cf3d31' : '#e8c582';
      ctx.beginPath();
      ctx.arc(size * 0.24, -size * 0.18, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f3b432';
      ctx.beginPath();
      ctx.moveTo(size * 0.39, -size * 0.2);
      ctx.lineTo(size * 0.62, -size * 0.12);
      ctx.lineTo(size * 0.39, -size * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(size * 0.28, -size * 0.23, 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (unit.variant === 'rooster') {
        ctx.fillStyle = '#e44538';
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.arc(size * (0.12 + i * 0.1), -size * 0.4 - Math.abs(i - 1) * 2, size * 0.09, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    drawUnitWeapon(ctx, unit, attackWave) {
      const kind = unit.attackKind;
      ctx.save();
      if (kind === 'guitar') {
        ctx.rotate(-0.6 + attackWave * 1.25);
        ctx.fillStyle = '#151720';
        ctx.strokeStyle = '#b9a3ff';
        ctx.lineWidth = 3;
        roundRect(ctx, -6, -unit.radius * 0.15, 12, unit.radius * 1.25, 5);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, unit.radius * 0.48, unit.radius * 0.28, unit.radius * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (kind === 'hoe') {
        ctx.rotate(-0.7 + attackWave * 1.4);
        ctx.strokeStyle = '#7b4b27';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, -unit.radius * 0.55);
        ctx.lineTo(0, unit.radius * 0.65);
        ctx.stroke();
        ctx.strokeStyle = '#4a4d52';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(-unit.radius * 0.35, -unit.radius * 0.52);
        ctx.lineTo(unit.radius * 0.22, -unit.radius * 0.52);
        ctx.stroke();
      } else if (kind === 'milk') {
        ctx.fillStyle = '#f7f4e7';
        ctx.strokeStyle = '#88b7d1';
        ctx.lineWidth = 2;
        roundRect(ctx, unit.radius * 0.32, -unit.radius * 0.1, 12, 25, 4);
        ctx.fill();
        ctx.stroke();
      } else if (kind === 'slingshot') {
        ctx.strokeStyle = '#8b542b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-8, 8);
        ctx.lineTo(0, -10);
        ctx.lineTo(8, 8);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawSpeedTrails(ctx, unit) {
      const profile = PLAYER[unit.playerId];
      ctx.save();
      ctx.strokeStyle = profile.light;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i += 1) {
        const offset = (i - 1.5) * 10;
        ctx.beginPath();
        ctx.moveTo(unit.x + offset, unit.y + (unit.playerId === 1 ? 28 : -28));
        ctx.lineTo(unit.x + offset, unit.y + (unit.playerId === 1 ? 70 : -70));
        ctx.stroke();
      }
      ctx.restore();
    }

    drawUnitName(ctx, unit) {
      ctx.save();
      ctx.font = '900 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = unit.short || unit.name;
      const width = Math.max(48, ctx.measureText(label).width + 14);
      ctx.fillStyle = 'rgba(3,6,15,0.78)';
      roundRect(ctx, unit.x - width / 2, unit.y + unit.radius + 14, width, 20, 7);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, unit.x, unit.y + unit.radius + 24);
      ctx.restore();
    }

    drawHealthBar(ctx, entity, width, offsetY, color) {
      const ratio = clamp(entity.hp / entity.maxHp, 0, 1);
      ctx.save();
      ctx.translate(entity.x, entity.y - offsetY);
      ctx.fillStyle = 'rgba(3,6,13,0.82)';
      roundRect(ctx, -width / 2, -5, width, 10, 5);
      ctx.fill();
      if (ratio > 0) {
        const gradient = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
        gradient.addColorStop(0, ratio < 0.3 ? '#ff3c54' : color);
        gradient.addColorStop(1, ratio < 0.3 ? '#ff8695' : '#a5e0ff');
        ctx.fillStyle = gradient;
        roundRect(ctx, -width / 2 + 2, -3, (width - 4) * ratio, 6, 3);
        ctx.fill();
      }
      ctx.restore();
    }

    drawProjectiles(ctx) {
      for (const projectile of this.projectiles) {
        if (!projectile.alive) continue;
        projectile.trail.forEach((point) => {
          const alpha = clamp(point.life / 0.22, 0, 1) * 0.36;
          ctx.fillStyle = projectile.kind === 'milk' ? `rgba(255,250,232,${alpha})` : projectile.kind === 'tax' ? `rgba(198,94,255,${alpha})` : `rgba(255,213,99,${alpha})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, projectile.radius * alpha, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.save();
        ctx.translate(projectile.x, projectile.y);
        if (projectile.kind === 'milk') {
          ctx.fillStyle = '#fff9e7';
          ctx.strokeStyle = '#d8ecf5';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (projectile.kind === 'tax') {
          const gradient = ctx.createRadialGradient(-2, -2, 1, 0, 0, projectile.radius + 6);
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.28, '#db8cff');
          gradient.addColorStop(1, 'rgba(115,32,179,0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, projectile.radius + 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (projectile.kind === 'slingshot') {
          ctx.fillStyle = '#4b321f';
          ctx.beginPath();
          ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const profile = PLAYER[projectile.sourcePlayerId];
          ctx.fillStyle = projectile.kind === 'king-shot' ? '#ffd65a' : profile.light;
          ctx.strokeStyle = profile.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    drawEffects(ctx) {
      for (const ring of this.rings) {
        const progress = 1 - ring.life / ring.maxLife;
        const alpha = clamp(ring.life / ring.maxLife, 0, 1);
        ctx.save();
        ctx.translate(ring.x, ring.y);
        ctx.rotate(ring.rotation || 0);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = ring.color;
        ctx.fillStyle = ring.color;
        if (ring.type === 'ring') {
          ctx.lineWidth = 7 * (1 - progress * 0.5);
          ctx.beginPath();
          ctx.arc(0, 0, lerp(10, ring.radius, progress), 0, Math.PI * 2);
          ctx.stroke();
        } else if (ring.type === 'explosion') {
          const radius = lerp(12, ring.radius, progress);
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.18, ring.color);
          gradient.addColorStop(0.72, 'rgba(255,83,25,0.28)');
          gradient.addColorStop(1, 'rgba(255,83,25,0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (ring.type === 'slash') {
          ctx.lineWidth = 11 * alpha;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, ring.radius * (0.65 + progress * 0.35), -1.25, 1.1);
          ctx.stroke();
        } else if (ring.type === 'punch' || ring.type === 'impact') {
          ctx.lineWidth = 8 * alpha;
          ctx.beginPath();
          ctx.arc(0, 0, ring.radius * progress, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 8; i += 1) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * ring.radius * 0.35, Math.sin(angle) * ring.radius * 0.35);
            ctx.lineTo(Math.cos(angle) * ring.radius * progress, Math.sin(angle) * ring.radius * progress);
            ctx.stroke();
          }
        } else if (ring.type === 'shockwave') {
          ctx.lineWidth = 10 * alpha;
          ctx.beginPath();
          ctx.ellipse(0, 0, ring.radius * progress, ring.radius * progress * 0.36, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (ring.type === 'arc' || ring.type === 'hoe') {
          ctx.lineWidth = 9 * alpha;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, ring.radius * 0.75, -1.4, 1.25);
          ctx.stroke();
        } else {
          ctx.lineWidth = 7 * alpha;
          ctx.beginPath();
          ctx.moveTo(-ring.radius * progress, -ring.radius * progress);
          ctx.lineTo(ring.radius * progress, ring.radius * progress);
          ctx.moveTo(ring.radius * progress, -ring.radius * progress);
          ctx.lineTo(-ring.radius * progress, ring.radius * progress);
          ctx.stroke();
        }
        ctx.restore();
      }
      for (const particle of this.particles) {
        const alpha = clamp(particle.life / particle.maxLife, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const floater of this.floaters) {
        const alpha = clamp(floater.life / floater.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '1000 18px Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 6;
        ctx.fillStyle = floater.color;
        ctx.strokeText(floater.text, floater.x, floater.y);
        ctx.fillText(floater.text, floater.x, floater.y);
        ctx.restore();
      }
    }

    drawCursors(ctx) {
      this.drawCursor(ctx, 2);
      this.drawCursor(ctx, 1);
    }

    drawCursor(ctx, playerId) {
      const cursor = this.cursors[playerId];
      const player = this.players[playerId];
      const card = getCard(player.hand[player.selectedIndex]);
      const profile = PLAYER[playerId];
      const pulse = 1 + Math.sin(this.elapsed * 7 + playerId) * 0.06;
      ctx.save();
      ctx.translate(cursor.x, cursor.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = cursor.valid ? `${profile.color}55` : 'rgba(255,40,70,0.34)';
      ctx.strokeStyle = cursor.valid ? profile.light : '#ff3857';
      ctx.lineWidth = 7;
      ctx.setLineDash([14, 9]);
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      if (card) {
        const image = assets.getPortrait(card.id) || assets.getCard(card.id);
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, 38, 0, Math.PI * 2);
        ctx.clip();
        if (image) ctx.drawImage(image, -38, -38, 76, 76);
        else {
          ctx.fillStyle = profile.dark;
          ctx.fillRect(-38, -38, 76, 76);
        }
        ctx.restore();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 39, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '1000 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 5;
        const text = `${playerId === 1 ? 'Q' : 'L'} · ${card.short}`;
        ctx.strokeText(text, 0, 76);
        ctx.fillText(text, 0, 76);
      }
      if (!cursor.valid) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-22, -22);
        ctx.lineTo(22, 22);
        ctx.moveTo(22, -22);
        ctx.lineTo(-22, 22);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawPauseTint(ctx) {
      ctx.save();
      ctx.fillStyle = 'rgba(3,6,15,0.46)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }
  }

  async function initialize() {
    cacheDom();
    loadApp();
    dom.soundButton.textContent = app.sound ? '🔊' : '🔇';
    attachUiEvents();
    renderShowcase();
    renderDecks();
    let lastStatus = '';
    await assets.loadAll((progress, key, success) => {
      const percent = Math.round(progress * 100);
      dom.loadingBar.style.width = `${percent}%`;
      const cardName = key.split(':')[0].replaceAll('-', ' ');
      const status = success ? `CARREGANDO ${cardName.toUpperCase()}...` : `USANDO IMAGEM INTERNA DE ${cardName.toUpperCase()}...`;
      if (status !== lastStatus) {
        dom.loadingText.textContent = status;
        lastStatus = status;
      }
    });
    renderShowcase();
    renderDecks();
    dom.loadingBar.style.width = '100%';
    dom.loadingText.textContent = 'ARENA PRONTA!';
    app.loaded = true;
    window.setTimeout(() => {
      showScreen('menuScreen');
    }, 420);
  }

  window.CAXIMBA_DEBUG = { app, assets, get game() { return app.game; } };

  window.addEventListener('DOMContentLoaded', () => {
    initialize().catch((error) => {
      console.error(error);
      if (dom.loadingText) dom.loadingText.textContent = 'ERRO AO INICIAR. ATUALIZE A PÁGINA.';
      toast('Erro ao iniciar', error.message || 'Falha desconhecida.');
    });
  });
})();
