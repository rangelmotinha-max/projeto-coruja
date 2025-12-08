const express = require('express');
const usuariosRoutes = require('./usuarios.routes');
const pessoasRoutes = require('./pessoas.routes');
const empresasRoutes = require('./empresas.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Comentário: prefixo dedicado para a API de usuários
router.use('/api/usuarios', usuariosRoutes);
router.use('/api/pessoas', pessoasRoutes);
router.use('/api/empresas', empresasRoutes);

module.exports = router;
