// routes/seasons.js
// Temporadas continuas post-21: retos semanales con recompensa en XP.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const content = require('../lib/content');
const scoring = require('../services/scoring');
const seasons = require('../services/seasons');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

async function loadSeasonStats(userId, season, progress) {
  progress = progress || (await store.getDoc('progress', userId)) || {};
  const [attempts, speaking, reviews] = await Promise.all([
    store.queryDocs('exerciseAttempts', { filters: [{ field: 'userId', op: '==', value: userId }] }),
    store.queryDocs('speakingSessions', { filters: [{ field: 'userId', op: '==', value: userId }] }),
    store.queryDocs('reviewResults', { filters: [{ field: 'userId', op: '==', value: userId }] }),
  ]);
  return {
    practiceDays: progress.practiceDays || [],
    exerciseAttempts: attempts,
    speakingSessions: speaking,
    reviews,
  };
}

async function loadClaim(userId, seasonKey) {
  return (await store.getDoc('seasonClaims', `${userId}_${seasonKey}`)) || {};
}

// GET /seasons/current -> temporada activa + retos con progreso
router.get('/current', async (req, res) => {
  const progress = (await store.getDoc('progress', req.user.id)) || {};
  if (!progress.completedDays?.includes(21)) {
    return res.status(403).json({ error: 'post21_required', message: 'Completa el reto de 21 días para desbloquear las temporadas.' });
  }

  const seasonConfig = content.getContinuous('seasons');
  if (!seasonConfig?.season) return res.status(404).json({ error: 'no_season_config' });

  const season = seasons.currentSeason();
  const stats = await loadSeasonStats(req.user.id, season, progress);
  const claimed = await loadClaim(req.user.id, season.key);
  const state = await seasons.buildSeason({
    season,
    retos: seasonConfig.season.retos,
    stats,
    claimedKey: `${req.user.id}_${season.key}`,
    claimed,
  });

  res.json({
    ...state,
    rewardBase: seasonConfig.season.rewardBase,
    seasonDays: seasonConfig.season.days,
    canClaim: state.reward > 0 && state.rewardClaimed === 0,
  });
});

// POST /seasons/claim -> reclama la recompensa XP de la temporada (una vez)
router.post('/claim', async (req, res) => {
  const progress = (await store.getDoc('progress', req.user.id)) || {};
  if (!progress.completedDays?.includes(21)) {
    return res.status(403).json({ error: 'post21_required' });
  }

  const seasonConfig = content.getContinuous('seasons');
  const season = seasons.currentSeason();
  const stats = await loadSeasonStats(req.user.id, season, progress);
  const claimed = await loadClaim(req.user.id, season.key);
  if (claimed.total) return res.status(409).json({ error: 'already_claimed' });

  const state = await seasons.buildSeason({
    season,
    retos: seasonConfig.season.retos,
    stats,
    claimed,
  });
  if (state.reward <= 0) return res.status(400).json({ error: 'nothing_to_claim' });

  progress.totalXp = (progress.totalXp || 0) + state.reward;
  await store.batchWrite([
    { collection: 'progress', id: req.user.id, data: progress },
    {
      collection: 'seasonClaims',
      id: `${req.user.id}_${season.key}`,
      data: {
        userId: req.user.id,
        seasonKey: season.key,
        total: state.reward,
        claimedAt: new Date().toISOString(),
      },
    },
  ]);

  res.json({ ok: true, xpEarned: state.reward, totalXp: progress.totalXp });
});

module.exports = router;
