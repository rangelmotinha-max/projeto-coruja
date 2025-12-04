const express = require('express');
const cors = require('cors');
const path = require('path');

const env = require('./config/env');
const routes = require('./src/routes/index.routes');
const errorHandler = require('./src/middlewares/errorHandler');
const authMiddleware = require('./src/middlewares/auth');

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

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

const PORT = env.port;
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = server;
