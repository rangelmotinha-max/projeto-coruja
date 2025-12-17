const express = require('express');
const entidadesController = require('../controllers/entidades.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { uploadEntidadeFotos } = require('../middlewares/upload');

const router = express.Router();

// Evita que requisições JSON sejam processadas pelo multer
const conditionalUploadEntidadeFotos = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  const isMultipart = contentType.includes('multipart/form-data');
  if (!isMultipart) return next();

  return uploadEntidadeFotos.array('fotos', 15)(req, res, next);
};

router.use(authMiddleware);

router.post('/', authorize(['admin', 'editor']), conditionalUploadEntidadeFotos, entidadesController.criar);
router.get('/', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), entidadesController.listar);
router.get('/:id', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), entidadesController.buscarPorId);
router.put('/:id', authorize(['admin', 'editor']), conditionalUploadEntidadeFotos, entidadesController.atualizar);
router.delete('/:id', authorize(['admin']), entidadesController.remover);

// Exporta middleware para reutilização em testes, se necessário
router.conditionalUploadEntidadeFotos = conditionalUploadEntidadeFotos;

module.exports = router;
