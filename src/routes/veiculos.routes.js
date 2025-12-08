const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/veiculos.controller');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

// Require authentication for all vehicle routes
router.use(auth);

router.get('/', authorize(['admin','gestor','operador']), ctrl.list);
router.post('/', authorize(['admin','gestor']), ctrl.create);
router.put('/:id', authorize(['admin','gestor']), ctrl.update);
router.delete('/:id', authorize(['admin']), ctrl.remove);

module.exports = router;