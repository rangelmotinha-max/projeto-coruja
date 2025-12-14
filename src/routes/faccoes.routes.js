const express = require('express');
const faccoesController = require('../controllers/faccoes.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

const router = express.Router();

// Todas as rotas de facções exigem autenticação
router.use(authMiddleware);

router.get('/', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), faccoesController.listar);
router.get('/:id', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), faccoesController.buscarPorId);
router.post('/', authorize(['admin', 'editor']), faccoesController.criar);

module.exports = router;
