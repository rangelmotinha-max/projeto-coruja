const express = require('express');
const pessoasController = require('../controllers/pessoas.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { uploadPessoaArquivos } = require('../middlewares/upload');

const router = express.Router();

// Middleware condicional para preservar req.body quando o corpo é JSON puro.
const conditionalUploadPessoaArquivos = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  const isMultipart = contentType.includes('multipart/form-data');

  if (!isMultipart) {
    // Comentário: pula o multer para não limpar o corpo em requisições JSON ou outros formatos.
    return next();
  }

  const uploadFields = uploadPessoaArquivos.fields([
    { name: 'fotos', maxCount: 10 },
    { name: 'documentosOcorrenciasPoliciais', maxCount: 20 },
    { name: 'imagensMonitoramento', maxCount: 60 },
  ]);

  return uploadFields(req, res, next);
};

// Protege todas as rotas garantindo que apenas usuários autenticados acessem.
router.use(authMiddleware);

// Criação de nova pessoa com suporte a upload de fotos.
router.post(
  '/',
  authorize(['admin', 'editor']),
  conditionalUploadPessoaArquivos,
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
  conditionalUploadPessoaArquivos,
  pessoasController.atualizar,
);

// Exclusão definitiva de um registro.
router.delete('/:id', authorize(['admin']), pessoasController.remover);

// Comentário: expõe middleware condicional para facilitar reutilização em testes automatizados.
router.conditionalUploadPessoaArquivos = conditionalUploadPessoaArquivos;

module.exports = router;
