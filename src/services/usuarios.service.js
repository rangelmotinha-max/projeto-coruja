const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/usuarios.model');
const { gerarToken, limparSenha, criarErro } = require('../utils/helpers');
const { validarCadastro, validarLogin, validarAtualizacao } = require('../utils/validators');

async function registrar(payload) {
  const dados = validarCadastro(payload);

  const existente = await UsuarioModel.findByEmail(dados.email);
  if (existente) {
    throw criarErro('E-mail já cadastrado', 409);
  }

  const senhaHash = await bcrypt.hash(dados.senha, 10);
  const usuario = await UsuarioModel.create({
    nome: dados.nome,
    email: dados.email,
    senhaHash,
    role: dados.role,
  });

  const token = gerarToken(usuario);
  return { usuario: limparSenha(usuario), token };
}

async function autenticar(payload) {
  const dados = validarLogin(payload);
  const usuario = await UsuarioModel.findByEmail(dados.email);

  if (!usuario) {
    throw criarErro('Credenciais inválidas', 401);
  }

  const senhaConfere = await bcrypt.compare(dados.senha, usuario.senhaHash);
  if (!senhaConfere) {
    throw criarErro('Credenciais inválidas', 401);
  }

  const token = gerarToken(usuario);
  return { usuario: limparSenha(usuario), token };
}

async function listar() {
  const usuarios = await UsuarioModel.findAll();
  return usuarios.map(limparSenha);
}

async function buscarPorId(id) {
  const usuario = await UsuarioModel.findById(id);
  if (!usuario) throw criarErro('Usuário não encontrado', 404);
  return limparSenha(usuario);
}

async function atualizar(id, payload, solicitante) {
  const atualizacoes = validarAtualizacao(payload);
  const usuario = await UsuarioModel.findById(id);

  if (!usuario) {
    throw criarErro('Usuário não encontrado', 404);
  }

  if (solicitante && solicitante.id !== id && solicitante.role !== 'admin') {
    throw criarErro('Sem permissão para atualizar este usuário', 403);
  }

  if (atualizacoes.email) {
    const existente = await UsuarioModel.findByEmail(atualizacoes.email);
    if (existente && existente.id !== id) {
      throw criarErro('E-mail já utilizado por outro usuário', 409);
    }
  }

  if (atualizacoes.senha) {
    atualizacoes.senhaHash = await bcrypt.hash(atualizacoes.senha, 10);
    delete atualizacoes.senha;
  }

  const atualizado = await UsuarioModel.update(id, atualizacoes);
  return limparSenha(atualizado);
}

async function remover(id, solicitante) {
  const usuario = await UsuarioModel.findById(id);
  if (!usuario) {
    throw criarErro('Usuário não encontrado', 404);
  }

  if (solicitante && solicitante.id !== id && solicitante.role !== 'admin') {
    throw criarErro('Sem permissão para remover este usuário', 403);
  }

  await UsuarioModel.delete(id);
  return true;
}

module.exports = {
  registrar,
  autenticar,
  listar,
  buscarPorId,
  atualizar,
  remover,
};
