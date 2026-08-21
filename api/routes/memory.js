// routes/memory.js
// Endpoints para el juego Memory Match.

const express = require('express');
const router = express.Router();
const memoryGame = require('../services/memoryGame');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /memory/board -> Obtener tablero de juego
router.get('/board', async (req, res) => {
  try {
    const mode = req.query.mode || 'daily';
    const size = req.query.size || '4x4';
    const board = await memoryGame.getBoard(req.user.id, mode, size);
    res.json(board);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /memory/result -> Guardar resultado de la partida y otorgar XP
router.post('/result', async (req, res) => {
  try {
    const { mode, size, seed, pairs, moves, timeMs } = req.body;
    if (!pairs || moves === undefined || timeMs === undefined) {
      return res.status(400).json({ error: 'missing_parameters', message: 'Faltan parámetros de la partida.' });
    }
    const result = await memoryGame.recordGameResult(req.user.id, {
      mode: mode || 'daily',
      size: size || '4x4',
      seed: seed || 'default',
      pairs: Number(pairs),
      moves: Number(moves),
      timeMs: Number(timeMs),
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /memory/stats -> Obtener estadísticas de Memory Match del usuario
router.get('/stats', async (req, res) => {
  try {
    const stats = await memoryGame.getStats(req.user.id);
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
