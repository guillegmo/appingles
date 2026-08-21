// routes/leaderboard.js
// Ligas semanales (retención, gratis): top usuarios por XP total y días
// de práctica de la semana en curso.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const seasons = require('../services/seasons');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /leaderboard — ranking por XP total + días activos esta semana
router.get('/', async (req, res) => {
  const progresses = await store.queryDocs('progress', { orderBy: { field: 'totalXp', direction: 'desc' }, limit: 100 });
  const season = seasons.currentSeason();

  // Nombres en lote (evita N+1 de getDoc por cada top-100 sin name back-filleado).
  const missingIds = progresses.filter((p) => !p.name).map((p) => p.id);
  const usersById = new Map();
  if (missingIds.length) {
    const users = await store.getDocs('users', missingIds);
    for (const u of users) usersById.set(u.id, u);
  }

  const rows = progresses.map((p) => {
    let name = p.name;
    if (!name) {
      name = usersById.get(p.id)?.name || 'Estudiante';
    }
    const weeklyDays = (p.practiceDays || []).filter((d) => seasons.inWindow(d, season)).length;
    return {
      userId: p.id,
      name,
      totalXp: p.totalXp || 0,
      weeklyDays,
      daysCompleted: (p.completedDays || []).length,
    };
  });

  // Back-fill de nombres en un solo batch (1 round-trip en Firestore).
  if (missingIds.length) {
    const backfills = missingIds
      .filter((id) => usersById.has(id))
      .map((id) => ({ type: 'update', collection: 'progress', id, data: { name: usersById.get(id).name } }));
    if (backfills.length) await store.batchWrite(backfills);
  }

  const byXp = rows
    .filter((r) => r.totalXp > 0)
    .sort((a, b) => b.totalXp - a.totalXp)
    .slice(0, 20)
    .map((r, i) => ({ rank: i + 1, ...r }));

  const byWeek = rows
    .filter((r) => r.weeklyDays > 0)
    .sort((a, b) => b.weeklyDays - a.weeklyDays || b.totalXp - a.totalXp)
    .slice(0, 20)
    .map((r, i) => ({ rank: i + 1, ...r }));

  const me = rows.find((r) => r.userId === req.user.id) || null;

  res.json({ allTime: byXp, weekly: byWeek, me });
});

module.exports = router;