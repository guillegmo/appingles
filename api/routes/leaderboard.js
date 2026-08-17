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
  const progresses = await store.listDocs('progress');
  const season = seasons.currentSeason();

  const rows = await Promise.all(
    progresses.map(async (p) => {
      const user = (await store.getDoc('users', p.id)) || {};
      const weeklyDays = (p.practiceDays || []).filter((d) => seasons.inWindow(d, season)).length;
      return {
        userId: p.id,
        name: user.name || 'Estudiante',
        totalXp: p.totalXp || 0,
        weeklyDays,
        daysCompleted: (p.completedDays || []).length,
      };
    }),
  );

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