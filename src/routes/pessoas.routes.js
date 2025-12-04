const express = require('express');
const pessoasController = require('../controllers/pessoas.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

const router = express.Router();

// Protege todas as rotas garantindo que apenas usuários autenticados acessem.
router.use(authMiddleware);

// Criação de nova pessoa.
router.post('/', authorize(['admin', 'editor']), pessoasController.criar);

// Listagem completa de pessoas cadastradas.
router.get('/', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), pessoasController.listar);

// Busca detalhada pelo identificador único.
router.get('/:id', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), pessoasController.buscarPorId);

// Atualização parcial ou completa de um registro existente.
router.put('/:id', authorize(['admin', 'editor']), pessoasController.atualizar);

// Exclusão definitiva de um registro.
router.delete('/:id', authorize(['admin']), pessoasController.remover);

module.exports = router;
