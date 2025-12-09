const express = require('express');
const pessoasController = require('../controllers/pessoas.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { uploadFotosPessoa } = require('../middlewares/upload');

const router = express.Router();

// Protege todas as rotas garantindo que apenas usuários autenticados acessem.
router.use(authMiddleware);

// Criação de nova pessoa com suporte a upload de fotos.
router.post('/', authorize(['admin', 'editor']), uploadFotosPessoa.array('fotos', 10), pessoasController.criar);

// Listagem completa de pessoas cadastradas.
router.get('/', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), pessoasController.listar);

// Busca detalhada pelo identificador único.
router.get('/:id', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), pessoasController.buscarPorId);

// Atualização parcial ou completa de um registro existente (fotos incluídas).
router.put('/:id', authorize(['admin', 'editor']), uploadFotosPessoa.array('fotos', 10), pessoasController.atualizar);

// Exclusão definitiva de um registro.
router.delete('/:id', authorize(['admin']), pessoasController.remover);

module.exports = router;
