const express = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

const router = express.Router();

// Suporta POST direto em '/' para criação via frontend (POST /api/usuarios)
router.post('/', usuariosController.registrar);
router.post('/registrar', usuariosController.registrar);
router.post('/login', usuariosController.login);

router.get('/', authMiddleware, authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), usuariosController.listar);
router.get('/:id', authMiddleware, authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), usuariosController.buscarPorId);
router.put('/:id', authMiddleware, authorize(['admin', 'editor']), usuariosController.atualizar);
router.delete('/:id', authMiddleware, authorize(['admin']), usuariosController.remover);

module.exports = router;
