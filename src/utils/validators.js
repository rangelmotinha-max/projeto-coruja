const { normalizarEmail, criarErro } = require('./helpers');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEmail(email) {
  const normalizado = normalizarEmail(email);
  if (!normalizado || !emailRegex.test(normalizado)) {
    throw criarErro('E-mail inválido', 400);
  }
  return normalizado;
}

function validarSenha(senha) {
  if (!senha || senha.length < 6) {
    throw criarErro('A senha deve ter pelo menos 6 caracteres', 400);
  }
  return senha;
}

function validarNome(nome) {
  if (!nome || nome.trim().length < 2) {
    throw criarErro('O nome é obrigatório e deve ter pelo menos 2 caracteres', 400);
  }
  return nome.trim();
}

function validarCadastro(payload) {
  return {
    nome: validarNome(payload.nome),
    email: validarEmail(payload.email),
    senha: validarSenha(payload.senha),
    role: payload.role || 'user',
  };
}

function validarLogin(payload) {
  return {
    email: validarEmail(payload.email),
    senha: validarSenha(payload.senha),
  };
}

function validarAtualizacao(payload) {
  const atualizacoes = {};

  if (payload.nome !== undefined) {
    atualizacoes.nome = validarNome(payload.nome);
  }
  if (payload.email !== undefined) {
    atualizacoes.email = validarEmail(payload.email);
  }
  if (payload.senha !== undefined) {
    atualizacoes.senha = validarSenha(payload.senha);
  }
  if (payload.role !== undefined) {
    atualizacoes.role = payload.role;
  }

  if (Object.keys(atualizacoes).length === 0) {
    throw criarErro('Nenhum dado para atualizar foi enviado', 400);
  }

  return atualizacoes;
}

module.exports = {
  validarCadastro,
  validarLogin,
  validarAtualizacao,
};
