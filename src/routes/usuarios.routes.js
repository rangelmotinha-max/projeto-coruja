const express = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.post('/registrar', usuariosController.registrar);
router.post('/login', usuariosController.login);

router.get('/', authMiddleware, usuariosController.listar);
router.get('/:id', authMiddleware, usuariosController.buscarPorId);
router.put('/:id', authMiddleware, usuariosController.atualizar);
router.delete('/:id', authMiddleware, usuariosController.remover);

module.exports = router;
