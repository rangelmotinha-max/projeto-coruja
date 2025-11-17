const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';

function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id, email: usuario.email, role: usuario.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

function limparSenha(usuario) {
  if (!usuario) return null;
  const { senhaHash, ...resto } = usuario;
  return resto;
}

function criarErro(mensagem, status = 400, detalhes) {
  const erro = new Error(mensagem);
  erro.status = status;
  if (detalhes) erro.details = detalhes;
  return erro;
}

function normalizarEmail(email) {
  return (email || '').trim().toLowerCase();
}

module.exports = {
  gerarToken,
  limparSenha,
  criarErro,
  normalizarEmail,
};
