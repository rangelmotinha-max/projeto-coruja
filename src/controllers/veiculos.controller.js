const veiculosService = require('../services/veiculos.service');

// Controlador HTTP para CRUD de veículos
async function criar(req, res, next) {
  try {
    const veiculo = await veiculosService.criar(req.body);
    return res.status(201).json(veiculo);
  } catch (error) {
    return next(error);
  }
}

async function listar(req, res, next) {
  try {
    const veiculos = await veiculosService.listar();
    return res.json(veiculos);
  } catch (error) {
    return next(error);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const veiculo = await veiculosService.buscarPorId(req.params.id);
    return res.json(veiculo);
  } catch (error) {
    return next(error);
  }
}

async function atualizar(req, res, next) {
  try {
    const veiculo = await veiculosService.atualizar(req.params.id, req.body);
    return res.json(veiculo);
  } catch (error) {
    return next(error);
  }
}

async function remover(req, res, next) {
  try {
    await veiculosService.remover(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { criar, listar, buscarPorId, atualizar, remover };
