const pessoaService = require('../services/pessoas.service');

// Controlador HTTP direcionando fluxo para serviços e padronizando respostas.
async function criar(req, res, next) {
  try {
    const pessoa = await pessoaService.criar(req.body);
    return res.status(201).json(pessoa);
  } catch (error) {
    return next(error);
  }
}

async function listar(req, res, next) {
  try {
    const pessoas = await pessoaService.listar();
    return res.json(pessoas);
  } catch (error) {
    return next(error);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const pessoa = await pessoaService.buscarPorId(req.params.id);
    return res.json(pessoa);
  } catch (error) {
    return next(error);
  }
}

async function atualizar(req, res, next) {
  try {
    const pessoa = await pessoaService.atualizar(req.params.id, req.body);
    return res.json(pessoa);
  } catch (error) {
    return next(error);
  }
}

async function remover(req, res, next) {
  try {
    await pessoaService.remover(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  atualizar,
  remover,
};
