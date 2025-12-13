const express = require('express');
const veiculosController = require('../controllers/veiculos.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { uploadFotosVeiculo } = require('../middlewares/upload');

const router = express.Router();

// Todas as rotas exigem usuário autenticado.
router.use(authMiddleware);

// Cadastro de veículos com upload opcional de foto.
router.post('/', authorize(['admin', 'editor']), uploadFotosVeiculo.array('foto', 1), veiculosController.criar);

// Listagem geral para popular a tabela da tela.
router.get('/', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), veiculosController.listar);

// Consulta individual por ID.
router.get('/:id', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), veiculosController.buscarPorId);

module.exports = router;
