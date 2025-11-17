const express = require('express');
const usuariosRoutes = require('./usuarios.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/usuarios', usuariosRoutes);

module.exports = router;
