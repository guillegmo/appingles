// services/memoryGame.js
// Lógica de negocio para Memory Match: generación de tableros EN <-> ES, cálculo de XP y persistencia.

const store = require('../lib/store');
const content = require('../lib/content');
const scoring = require('./scoring');
const streakService = require('./streak');
const { getCategory, getIconSVG } = require('./memoryUtils');

async function getUserVocabulary(userId) {
  const items = [];
  
// 1. Palabras de reviewCards (falladas)
  const userReview = await store.queryDocs('reviewCards', { filters: [{ field: 'userId', op: '==', value: userId }] });
  for (const c of userReview) {
    if (c.word && c.es) {
      items.push({ en: c.word, es: c.es });
    }
  }

  // 2. Banco de vocabulario de usuario
  const vocabDoc = await store.getDoc('vocabulary', userId);
  if (vocabDoc && Array.isArray(vocabDoc.words)) {
    for (const w of vocabDoc.words) {
      if (w.en && w.es) items.push({ en: w.en, es: w.es });
    }
  }

  // 3. Vocabulario de los primeros días completados o disponibles
  const challenge = content.getChallengeIndex();
  if (challenge && challenge.days) {
    for (const d of challenge.days.slice(0, 7)) {
      const dayData = content.getDay(d.day);
      if (dayData && Array.isArray(dayData.vocabulary)) {
        for (const v of dayData.vocabulary) {
          if (v.en && v.es) items.push({ en: v.en, es: v.es });
        }
      }
    }
  }

  // Fallback si no hay nada
  if (items.length === 0) {
    items.push(
      { en: 'Hello', es: 'Hola' },
      { en: 'Good morning', es: 'Buenos días' },
      { en: 'Apple', es: 'Manzana' },
      { en: 'Water', es: 'Agua' },
      { en: 'Dog', es: 'Perro' },
      { en: 'Cat', es: 'Gato' },
      { en: 'House', es: 'Casa' },
      { en: 'Book', es: 'Libro' },
      { en: 'Car', es: 'Coche' },
      { en: 'Coffee', es: 'Café' },
      { en: 'Tree', es: 'Árbol' },
      { en: 'Phone', es: 'Teléfono' }
    );
  }

  // Deduplicar por en
  const uniqueMap = new Map();
  for (const item of items) {
    if (!uniqueMap.has(item.en.toLowerCase())) {
      uniqueMap.set(item.en.toLowerCase(), item);
    }
  }
  return Array.from(uniqueMap.values());
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SIZES = {
  '4x4': 8,
  '4x5': 10,
  '6x4': 12,
};

async function getBoard(userId, mode = 'daily', sizeKey = '4x4') {
  const pairsCount = SIZES[sizeKey] || 8;
  const allVocab = await getUserVocabulary(userId);
  
  // Seed determinista para el modo diario
  let seed = `${mode}-${new Date().toISOString().slice(0, 10)}`;
  if (mode === 'free') {
    seed = `free-${Date.now()}-${Math.random()}`;
  }

  const shuffledVocab = shuffle(allVocab);
  const selectedPairs = shuffledVocab.slice(0, pairsCount);

  // Cada par genera 2 cartas: una en inglés (en) y otra en español (es)
  const cards = [];
  for (let i = 0; i < selectedPairs.length; i++) {
    const item = selectedPairs[i];
    const category = getCategory(item.en);
    const iconSVG = getIconSVG(category, item.en);
    const cardId1 = `p${i}-en`;
    const cardId2 = `p${i}-es`;

    cards.push(
      { id: cardId1, text: item.en, lang: 'en', category, iconSVG, pairIndex: i },
      { id: cardId2, text: item.es, lang: 'es', category, iconSVG, pairIndex: i }
    );
  }

  const finalCards = shuffle(cards);

  return {
    cards: finalCards,
    seed,
    mode,
    size: sizeKey,
    pairs: pairsCount,
  };
}

async function recordGameResult(userId, { mode, size, seed, pairs, moves, timeMs }) {
  const sizeConfig = SIZES[size] || 8;
  const baseXP = 15;
  const medianTime = size === '4x4' ? 30000 : size === '4x5' ? 45000 : 60000;

  let speedBonus = timeMs < medianTime ? 10 : 0;
  let efficiencyBonus = moves <= sizeConfig * 1.5 ? 10 : 0;
  let dailyBonus = mode === 'daily' ? 25 : 0;
  let xpEarned = baseXP + speedBonus + efficiencyBonus + dailyBonus;

  const todayKey = new Date().toISOString().slice(0, 10);
  const statsId = `${userId}_stats`;

  // Transaccional: partidas simultáneas no pierden XP ni estadísticas
  // (read->modify->write atómico sobre progress y memoryStats).
  // Firestore exige TODAS las lecturas antes de cualquier escritura.
  const outcome = await store.runTransaction(async (tx) => {
    const [progressDoc, existingStats] = await Promise.all([
      tx.get('progress', userId),
      tx.get('memoryStats', statsId),
    ]);
    const progress = progressDoc || { completedDays: [], totalXp: 0, practiceDays: [] };

    if (!progress.practiceDays.includes(todayKey)) {
      progress.practiceDays.push(todayKey);
    }
    progress.totalXp = (progress.totalXp || 0) + xpEarned;

    const streaks = streakService.computeStreaks(progress.practiceDays);

    tx.set('memoryResults', `${userId}_${Date.now()}`, {
      userId,
      mode,
      size,
      seed,
      pairs,
      moves,
      timeMs,
      xpEarned,
      createdAt: new Date().toISOString(),
    });

    const prevStats = existingStats || {
      totalGames: 0,
      totalWins: 0,
      bestTime: null,
      bestMoves: null,
      totalXpEarned: 0,
    };

    const updatedStats = {
      totalGames: prevStats.totalGames + 1,
      totalWins: prevStats.totalWins + 1,
      bestTime: prevStats.bestTime === null ? timeMs : Math.min(prevStats.bestTime, timeMs),
      bestMoves: prevStats.bestMoves === null ? moves : Math.min(prevStats.bestMoves, moves),
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
      lastPlayed: new Date().toISOString(),
      totalXpEarned: prevStats.totalXpEarned + xpEarned,
    };
    tx.set('memoryStats', statsId, updatedStats);
    tx.set('progress', userId, progress);

    return { progress, streaks };
  });

  const { progress: progressDoc, streaks } = outcome;

  const badges = scoring.evaluateBadges({
    daysCompleted: progressDoc.completedDays.length,
    currentStreak: streaks.currentStreak,
    exercisesCompleted: (progressDoc.exercisesCompleted || 0) + 1,
  });

  return {
    ok: true,
    xpEarned,
    totalXp: progressDoc.totalXp,
    timeMs,
    moves,
    pairs,
    bonuses: {
      speed: speedBonus,
      efficiency: efficiencyBonus,
      daily: dailyBonus,
    },
    streak: {
      current: streaks.currentStreak,
      longest: streaks.longestStreak,
      protected: mode === 'daily',
    },
    badges,
  };
}

async function getStats(userId) {
  const statsId = `${userId}_stats`;
  const stats = await store.getDoc('memoryStats', statsId);
  return stats || {
    totalGames: 0,
    totalWins: 0,
    bestTime: null,
    bestMoves: null,
    currentStreak: 0,
    longestStreak: 0,
    lastPlayed: null,
    totalXpEarned: 0,
  };
}

module.exports = { getBoard, recordGameResult, getStats };

