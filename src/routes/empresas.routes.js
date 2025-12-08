const express = require('express');
const empresasController = require('../controllers/empresas.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

const router = express.Router();

router.use(authMiddleware);

router.post('/', authorize(['admin', 'editor']), empresasController.criar);
router.get('/', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), empresasController.listar);
router.get('/:id', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), empresasController.buscarPorId);
router.put('/:id', authorize(['admin', 'editor']), empresasController.atualizar);
router.delete('/:id', authorize(['admin']), empresasController.remover);

module.exports = router;
