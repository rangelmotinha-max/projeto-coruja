const express = require('express');
const veiculosController = require('../controllers/veiculos.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

const router = express.Router();

// Protege as rotas de veículos com autenticação e perfis compatíveis
router.use(authMiddleware);

router.post('/', authorize(['admin', 'editor']), veiculosController.criar);
router.get('/', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), veiculosController.listar);
router.get('/:id', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), veiculosController.buscarPorId);
router.put('/:id', authorize(['admin', 'editor']), veiculosController.atualizar);
router.delete('/:id', authorize(['admin']), veiculosController.remover);

module.exports = router;
