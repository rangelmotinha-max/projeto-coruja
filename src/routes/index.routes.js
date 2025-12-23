const express = require('express');
const usuariosRoutes = require('./usuarios.routes');
const pessoasRoutes = require('./pessoas.routes');
const empresasRoutes = require('./empresas.routes');
const veiculosRoutes = require('./veiculos.routes');
const faccoesRoutes = require('./faccoes.routes');
const entidadesRoutes = require('./entidades.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Comentário: prefixo dedicado para a API de usuários
router.use('/api/usuarios', usuariosRoutes);
router.use('/api/pessoas', pessoasRoutes);
router.use('/api/empresas', empresasRoutes);
router.use('/api/veiculos', veiculosRoutes);
router.use('/api/faccoes', faccoesRoutes);
router.use('/api/entidades', entidadesRoutes);
router.use('/api/dashboard', dashboardRoutes);

module.exports = router;
