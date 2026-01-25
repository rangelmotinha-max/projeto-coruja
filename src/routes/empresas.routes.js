const express = require('express');
const empresasController = require('../controllers/empresas.controller');
const authMiddleware = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { uploadEmpresaFotos } = require('../middlewares/upload');

const router = express.Router();

router.use(authMiddleware);

// Middleware condicional para permitir JSON puro sem multipart em empresas
const conditionalUploadEmpresaFotos = (req, res, next) => {
	const contentType = req.headers['content-type'] || '';
	const isMultipart = contentType.includes('multipart/form-data');
	if (!isMultipart) return next();
	const uploadFields = uploadEmpresaFotos.fields([
		{ name: 'fotos', maxCount: 10 },
	]);
	return uploadFields(req, res, next);
};

router.post('/', authorize(['admin', 'editor']), conditionalUploadEmpresaFotos, empresasController.criar);
router.get('/', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), empresasController.listar);
router.get('/:id', authorize(['admin', 'editor', 'viewer', 'user', 'leitor']), empresasController.buscarPorId);
router.put('/:id', authorize(['admin', 'editor']), conditionalUploadEmpresaFotos, empresasController.atualizar);
router.delete('/:id', authorize(['admin']), empresasController.remover);

router.conditionalUploadEmpresaFotos = conditionalUploadEmpresaFotos;

module.exports = router;
