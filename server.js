const express = require('express');
const cors = require('cors');
const path = require('path');

const env = require('./config/env');
const routes = require('./src/routes/index.routes');
const errorHandler = require('./src/middlewares/errorHandler');
const authMiddleware = require('./src/middlewares/auth');
const { initDatabase } = require('./src/database/sqlite');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/welcome', authMiddleware, (req, res) => {
  res.redirect('/home');
});

app.get('/home', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/perfil', authMiddleware, (req, res) => {
  res.redirect('/home');
});

// Rota protegida garantindo acesso autenticado à página de Usuários
app.get('/usuarios', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'usuarios.html'));
});

// Rota protegida garantindo acesso autenticado à página de Pessoas
app.get('/cadastro/pessoas', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cadastro', 'pessoas.html'));
});

// Rota protegida garantindo acesso autenticado à página de Empresas
app.get('/cadastro/empresas', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cadastro', 'empresas.html'));
});

// Rota protegida garantindo acesso autenticado à página de Veículos
app.get('/cadastro/veiculos', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cadastro', 'veiculos.html'));
});

// Rotas protegidas para páginas de Consulta com filtros especializados
app.get('/consulta/pessoas', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'consulta', 'pessoas.html'));
});

app.get('/consulta/empresas', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'consulta', 'empresas.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

const PORT = env.port;
let server;

// Garante que o banco (e migrações) estejam prontos antes de subir o servidor
async function bootstrap() {
  try {
    await initDatabase();
    server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Erro ao iniciar servidor após preparar banco:', err);
    process.exit(1);
  }
}

bootstrap();

module.exports = server;
