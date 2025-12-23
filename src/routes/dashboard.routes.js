const express = require('express');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const dashboardService = require('../services/dashboard.service');

const router = express.Router();

router.use(authMiddleware);

// Resumo da seção "Usuários" no dashboard (focado em Pessoas)
router.get('/usuarios', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), async (req, res, next) => {
  try {
    const data = await dashboardService.getUsuariosSummary();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
