const express = require('express');
const pessoasController = require('../controllers/pessoas.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Protege todas as rotas garantindo que apenas usuários autenticados acessem.
router.use(authMiddleware);

// Criação de nova pessoa.
router.post('/', pessoasController.criar);

// Listagem completa de pessoas cadastradas.
router.get('/', pessoasController.listar);

// Busca detalhada pelo identificador único.
router.get('/:id', pessoasController.buscarPorId);

// Atualização parcial ou completa de um registro existente.
router.put('/:id', pessoasController.atualizar);

// Exclusão definitiva de um registro.
router.delete('/:id', pessoasController.remover);

module.exports = router;
