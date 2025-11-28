const express = require('express');
const usuariosRoutes = require('./usuarios.routes');
const pessoasRoutes = require('./pessoas.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/usuarios', usuariosRoutes);
router.use('/api/pessoas', pessoasRoutes);

module.exports = router;
