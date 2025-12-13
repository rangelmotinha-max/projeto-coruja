const express = require('express');
const pessoasController = require('../controllers/pessoas.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { uploadPessoaArquivos } = require('../middlewares/upload');

const router = express.Router();

// Protege todas as rotas garantindo que apenas usuários autenticados acessem.
router.use(authMiddleware);

// Criação de nova pessoa com suporte a upload de fotos.
router.post(
  '/',
  authorize(['admin', 'editor']),
  uploadPessoaArquivos.fields([
    { name: 'fotos', maxCount: 10 },
    { name: 'documentosOcorrenciasPoliciais', maxCount: 20 },
  ]),
  pessoasController.criar,
);

// Listagem/busca de pessoas cadastradas com filtros por nome, documento, familiares e contatos.
// A rota "/buscar" é um alias explícito para consultas filtradas via querystring.
router.get('/', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), pessoasController.listar);
router.get('/buscar', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), pessoasController.listar);

// Busca detalhada pelo identificador único.
router.get('/:id', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), pessoasController.buscarPorId);

// Atualização parcial ou completa de um registro existente (fotos incluídas).
router.put(
  '/:id',
  authorize(['admin', 'editor']),
  uploadPessoaArquivos.fields([
    { name: 'fotos', maxCount: 10 },
    { name: 'documentosOcorrenciasPoliciais', maxCount: 20 },
  ]),
  pessoasController.atualizar,
);

// Exclusão definitiva de um registro.
router.delete('/:id', authorize(['admin']), pessoasController.remover);

module.exports = router;
