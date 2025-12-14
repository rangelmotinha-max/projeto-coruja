const FaccaoModel = require('../models/faccoes.model');
const { criarErro } = require('../utils/helpers');

// Serviço centraliza regras de criação/listagem de facções.
async function listar(termo) {
  const filtros = (termo || '').trim();
  return FaccaoModel.findAll({ termo: filtros });
}

async function criar(payload) {
  const nome = (payload?.nome || payload?.descricao || '').trim();
  const sigla = (payload?.sigla || '').trim();

  if (!nome) {
    throw criarErro('Informe um nome para a facção ou organização.', 400);
  }

  const faccao = await FaccaoModel.create({ nome, sigla: sigla || null, descricao: payload?.descricao || null });
  return faccao;
}

async function buscarPorId(id) {
  const faccao = await FaccaoModel.findById(id);
  if (!faccao) throw criarErro('Facção não encontrada.', 404);
  return faccao;
}

module.exports = { listar, criar, buscarPorId };
