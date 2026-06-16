export const CARD_RARITIES = {
  Comum: { label: 'Comum', color: '#80a3bb', glow: '#b8d4e4', order: 1 },
  Rara: { label: 'Rara', color: '#f1b83b', glow: '#ffe09a', order: 2 },
  Épica: { label: 'Épica', color: '#c35bf1', glow: '#e3a4ff', order: 3 }
};

export const SPEED_VALUES = {
  muitoLenta: 34,
  lenta: 46,
  media: 62,
  rapida: 80,
  muitoRapida: 103
};

export const TARGET_TYPES = {
  ALL: 'all',
  GROUND: 'ground',
  BUILDINGS: 'buildings'
};

export const CARDS = [
  {
    id: 'austin-boss',
    name: 'Austin Boss',
    shortName: 'Austin',
    cost: 5,
    rarity: 'Épica',
    role: 'Duelista imprevisível',
    category: 'Tropa',
    image: 'assets/cards/austin-boss.jpg',
    portrait: 'assets/portraits/austin-boss.jpg',
    hp: 1360,
    damage: 275,
    speed: SPEED_VALUES.media,
    speedLabel: 'Média',
    range: 58,
    attackSpeed: 0.86,
    target: TARGET_TYPES.GROUND,
    mass: 1.05,
    radius: 34,
    sight: 250,
    critChance: 0.28,
    critMultiplier: 1.85,
    missChance: 0.08,
    deployCount: 1,
    special: 'chaosStrike',
    description: 'Entra causando pressão e confunde os inimigos com golpes imprevisíveis.',
    ability: 'Cada ataque pode errar ou virar um golpe crítico. Ao entrar, reduz por alguns segundos a precisão dos inimigos próximos.',
    quote: 'Faz barulho, confunde e bate. Se pegar embalo, vira o chefe do caos.',
    balanceNote: 'Ótimo contra tropas médias, mas pode perder valor quando a sorte não ajuda.'
  },
  {
    id: 'rei-do-ataque',
    name: 'Rei do Ataque',
    shortName: 'Rei',
    cost: 6,
    rarity: 'Épica',
    role: 'Brutamontes de linha de frente',
    category: 'Tropa',
    image: 'assets/cards/rei-do-ataque.jpg',
    portrait: 'assets/portraits/rei-do-ataque.jpg',
    hp: 1840,
    damage: 390,
    speed: SPEED_VALUES.media,
    speedLabel: 'Média',
    range: 60,
    attackSpeed: 1.18,
    target: TARGET_TYPES.GROUND,
    mass: 1.55,
    radius: 40,
    sight: 240,
    knockback: 28,
    deployCount: 1,
    special: 'kingPunch',
    description: 'Avança até o inimigo e desfere socos absurdamente fortes.',
    ability: 'O golpe principal causa dano pesado e empurra o alvo. Contra unidades grandes, recebe resistência extra a empurrões.',
    quote: 'Um soco, um estrago. Se entrar no caminho, até navio racha.',
    balanceNote: 'Muito forte em duelo direto, porém caro e vulnerável a enxames.'
  },
  {
    id: 'familia-brasileira',
    name: 'Família Brasileira',
    shortName: 'Família',
    cost: 6,
    rarity: 'Rara',
    role: 'Esquadrão misto',
    category: 'Tropa',
    image: 'assets/cards/familia-brasileira.jpg',
    portrait: 'assets/portraits/familia-brasileira.jpg',
    hp: 1760,
    damage: 240,
    speed: SPEED_VALUES.media,
    speedLabel: 'Média',
    range: 60,
    attackSpeed: 1.05,
    target: TARGET_TYPES.ALL,
    mass: 1.0,
    radius: 31,
    sight: 270,
    deployCount: 3,
    special: 'familySquad',
    description: 'Trio que avança junto e pressiona tropas e torres inimigas.',
    ability: 'Invoca dois adultos corpo a corpo e um filho que ataca de longe com estilingue.',
    quote: 'Os três vêm juntos. Se a casa avança, a arena treme.',
    balanceNote: 'Versátil e excelente para contra-ataques, mas sofre bastante contra dano em área.'
  },
  {
    id: 'thai-kings',
    name: 'Thai Kings',
    shortName: 'Thai',
    cost: 4,
    rarity: 'Rara',
    role: 'Lutador de alto risco',
    category: 'Tropa',
    image: 'assets/cards/thai-kings.jpg',
    portrait: 'assets/portraits/thai-kings.jpg',
    hp: 1320,
    damage: 310,
    speed: SPEED_VALUES.media,
    speedLabel: 'Média',
    range: 57,
    attackSpeed: 0.92,
    target: TARGET_TYPES.GROUND,
    mass: 1.0,
    radius: 33,
    sight: 245,
    critChance: 0.24,
    critMultiplier: 2.15,
    missChance: 0.20,
    deployCount: 1,
    special: 'crookedPunch',
    description: 'Avança para cima do inimigo e distribui socos imprevisíveis.',
    ability: 'Alguns golpes saem tortos e erram; quando encaixa um crítico, causa dano enorme.',
    quote: 'Bate torto, mas quando encaixa, apaga a luz.',
    balanceNote: 'Barato para o potencial de dano, mas inconsistente contra tropas rápidas.'
  },
  {
    id: 'bomba-man',
    name: 'Bomba Man',
    shortName: 'Bomba',
    cost: 4,
    rarity: 'Rara',
    role: 'Demolidor explosivo',
    category: 'Tropa',
    image: 'assets/cards/bomba-man.jpg',
    portrait: 'assets/portraits/bomba-man.jpg',
    hp: 980,
    damage: 860,
    speed: SPEED_VALUES.rapida,
    speedLabel: 'Rápida',
    range: 24,
    attackSpeed: 1.6,
    target: TARGET_TYPES.GROUND,
    mass: 0.9,
    radius: 31,
    sight: 260,
    splash: 145,
    deployCount: 1,
    special: 'suicideBomb',
    description: 'Corre até o inimigo e explode no contato, causando grande dano em área.',
    ability: 'Ao receber o primeiro ataque ou tocar no alvo, se autodestrói e espalha dano explosivo ao redor.',
    quote: 'Chega apontando, sai explodindo. Se encostar, já era.',
    balanceNote: 'Pode decidir uma defesa inteira, mas morre antes de chegar quando é bem controlado.'
  },
  {
    id: 'indian-tax',
    name: 'Indian Tax',
    shortName: 'Tax',
    cost: 4,
    rarity: 'Rara',
    role: 'Gerador de energia',
    category: 'Tropa',
    image: 'assets/cards/indian-tax.jpg',
    portrait: 'assets/portraits/indian-tax.jpg',
    hp: 1420,
    damage: 90,
    speed: SPEED_VALUES.lenta,
    speedLabel: 'Lenta',
    range: 145,
    attackSpeed: 1.35,
    target: TARGET_TYPES.ALL,
    mass: 0.95,
    radius: 32,
    sight: 300,
    projectileSpeed: 430,
    deployCount: 1,
    special: 'elixirGenerator',
    description: 'Gera energia ao longo do tempo enquanto estiver vivo.',
    ability: 'Produz energia continuamente para o dono. O efeito termina quando for derrotado.',
    quote: 'Dinheiro, energia e controle. Enquanto ele viver, o caixa não para.',
    balanceNote: 'Precisa sobreviver para compensar o custo; proteja-o atrás das torres.'
  },
  {
    id: 'goblin-do-leite',
    name: 'Goblin do Leite',
    shortName: 'Leite',
    cost: 2,
    rarity: 'Comum',
    role: 'Sabotador barato',
    category: 'Tropa',
    image: 'assets/cards/goblin-do-leite.jpg',
    portrait: 'assets/portraits/goblin-do-leite.jpg',
    hp: 620,
    damage: 105,
    speed: SPEED_VALUES.rapida,
    speedLabel: 'Rápida',
    range: 42,
    attackSpeed: 0.72,
    target: TARGET_TYPES.GROUND,
    mass: 0.5,
    radius: 25,
    sight: 260,
    deployCount: 1,
    special: 'milkLatch',
    description: 'Gruda no inimigo, deixa o alvo lento e causa dano contínuo.',
    ability: 'O primeiro alvo atingido recebe lentidão e dano por alguns segundos. O Goblin é frágil e pode ser eliminado rapidamente.',
    quote: 'Gruda, atrapalha e enche o saco. Com leite na cara, ninguém corre direito.',
    balanceNote: 'Excelente para parar tanques, mas quase não aguenta dano direto.'
  },
  {
    id: 'jaimes-agricultor',
    name: 'Jaimes Agricultor do Crime',
    shortName: 'Jaimes',
    cost: 5,
    rarity: 'Rara',
    role: 'Combatente energizado',
    category: 'Tropa',
    image: 'assets/cards/jaimes-agricultor.jpg',
    portrait: 'assets/portraits/jaimes-agricultor.jpg',
    hp: 1540,
    damage: 285,
    speed: SPEED_VALUES.lenta,
    speedLabel: 'Lenta',
    range: 65,
    attackSpeed: 1.08,
    target: TARGET_TYPES.GROUND,
    mass: 1.15,
    radius: 36,
    sight: 245,
    deployCount: 1,
    special: 'energizedHoe',
    description: 'Avança no campo e golpeia os inimigos com sua enxada.',
    ability: 'Quando fica abaixo de metade da vida, causa mais dano e ataca mais rápido, mas perde precisão.',
    quote: 'Planta o caos, colhe confusão. Se vier motivado, a enxada canta.',
    balanceNote: 'Fica perigoso quando machucado; finalizar rápido evita a transformação.'
  },
  {
    id: 'kaue-emo',
    name: 'Kauê Emo',
    shortName: 'Kauê',
    cost: 4,
    rarity: 'Comum',
    role: 'Invocador de galinheiro',
    category: 'Tropa',
    image: 'assets/cards/kaue-emo.jpg',
    portrait: 'assets/portraits/kaue-emo.jpg',
    hp: 1320,
    damage: 190,
    speed: SPEED_VALUES.media,
    speedLabel: 'Média',
    range: 68,
    attackSpeed: 1.0,
    target: TARGET_TYPES.GROUND,
    mass: 0.85,
    radius: 31,
    sight: 255,
    deployCount: 4,
    special: 'chickenCrew',
    description: 'Entra na arena acompanhado por duas galinhas e um galo briguento.',
    ability: 'As aves cercam os inimigos e distraem ataques, enquanto Kauê causa dano constante.',
    quote: 'Traz o galinheiro pra batalha.',
    balanceNote: 'Gera muita pressão pelo custo, mas o grupo inteiro sofre contra explosões.'
  },
  {
    id: 'come-gordura',
    name: 'Come Gordura',
    shortName: 'Gordura',
    cost: 3,
    rarity: 'Comum',
    role: 'Tanque de impacto',
    category: 'Tropa',
    image: 'assets/cards/come-gordura.jpg',
    portrait: 'assets/portraits/come-gordura.jpg',
    hp: 1650,
    damage: 320,
    speed: SPEED_VALUES.lenta,
    speedLabel: 'Lenta',
    range: 66,
    attackSpeed: 1.35,
    target: TARGET_TYPES.GROUND,
    mass: 1.7,
    radius: 42,
    sight: 235,
    knockback: 15,
    deployCount: 1,
    special: 'guitarSmash',
    description: 'Avança devagar e bate nos inimigos com sua guitarra.',
    ability: 'Cada golpe causa impacto pesado e empurra levemente o alvo.',
    quote: 'Peso, rock e pancada. Quando a guitarra desce, todo mundo respeita.',
    balanceNote: 'Muita vida pelo custo, porém lento e incapaz de atingir unidades distantes.'
  },
  {
    id: 'zeca-maratona',
    name: 'Zeca Maratona',
    shortName: 'Zeca',
    cost: 4,
    rarity: 'Rara',
    role: 'Corredor de torre',
    category: 'Tropa',
    image: 'assets/cards/zeca-maratona.jpg',
    portrait: 'assets/portraits/zeca-maratona.jpg',
    hp: 1820,
    damage: 980,
    speed: SPEED_VALUES.muitoRapida,
    speedLabel: 'Muito rápida',
    range: 32,
    attackSpeed: 2.0,
    target: TARGET_TYPES.BUILDINGS,
    mass: 1.0,
    radius: 31,
    sight: 900,
    splash: 105,
    deployCount: 1,
    special: 'towerDive',
    description: 'Corre direto para a torre inimiga ignorando tropas pelo caminho.',
    ability: 'Ao alcançar uma construção, se joga contra ela, morre no impacto e causa dano considerável.',
    quote: 'Corre, se joga, deixa marca. A torre não verá chegar.',
    balanceNote: 'Uma ameaça constante às torres, mas pode ser eliminado antes do impacto.'
  }
];

export const TOKEN_BLUEPRINTS = {
  familyAdult: {
    name: 'Adulto da Família', hp: 620, damage: 125, speed: 62, range: 52, attackSpeed: 0.95,
    target: TARGET_TYPES.GROUND, mass: 0.8, radius: 27, sight: 250, portrait: 'assets/portraits/familia-brasileira.jpg'
  },
  familyChild: {
    name: 'Filho da Família', hp: 390, damage: 88, speed: 58, range: 190, attackSpeed: 0.82,
    target: TARGET_TYPES.ALL, mass: 0.42, radius: 23, sight: 310, projectileSpeed: 520, portrait: 'assets/portraits/familia-brasileira.jpg'
  },
  chicken: {
    name: 'Galinha', hp: 165, damage: 42, speed: 88, range: 28, attackSpeed: 0.58,
    target: TARGET_TYPES.GROUND, mass: 0.22, radius: 17, sight: 220, portrait: 'assets/portraits/kaue-emo.jpg'
  },
  rooster: {
    name: 'Galo', hp: 280, damage: 76, speed: 78, range: 34, attackSpeed: 0.72,
    target: TARGET_TYPES.GROUND, mass: 0.34, radius: 20, sight: 235, portrait: 'assets/portraits/kaue-emo.jpg'
  }
};

export const DEFAULT_DECKS = {
  1: ['goblin-do-leite', 'come-gordura', 'thai-kings', 'kaue-emo', 'bomba-man', 'indian-tax', 'austin-boss', 'zeca-maratona'],
  2: ['goblin-do-leite', 'come-gordura', 'familia-brasileira', 'jaimes-agricultor', 'bomba-man', 'rei-do-ataque', 'austin-boss', 'zeca-maratona']
};

export function getCard(id) {
  return CARDS.find(card => card.id === id) || null;
}

export function getDeckCards(ids) {
  return ids.map(getCard).filter(Boolean);
}

export function calculateDeckMetrics(ids) {
  const cards = getDeckCards(ids);
  if (!cards.length) return { averageCost: 0, totalHealth: 0, averageDamage: 0 };
  return {
    averageCost: cards.reduce((sum, card) => sum + card.cost, 0) / cards.length,
    totalHealth: cards.reduce((sum, card) => sum + card.hp, 0),
    averageDamage: cards.reduce((sum, card) => sum + card.damage, 0) / cards.length
  };
}

export function validateDeck(ids) {
  if (!Array.isArray(ids)) return false;
  if (ids.length !== 8) return false;
  return ids.every(id => Boolean(getCard(id)));
}

export function randomDeck() {
  const pool = [...CARDS].sort(() => Math.random() - 0.5);
  return pool.slice(0, 8).map(card => card.id);
}

export function sortCards(cards, mode = 'cost') {
  const copy = [...cards];
  const sorters = {
    cost: (a, b) => a.cost - b.cost || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    health: (a, b) => b.hp - a.hp,
    damage: (a, b) => b.damage - a.damage,
    rarity: (a, b) => CARD_RARITIES[b.rarity].order - CARD_RARITIES[a.rarity].order
  };
  return copy.sort(sorters[mode] || sorters.cost);
}
