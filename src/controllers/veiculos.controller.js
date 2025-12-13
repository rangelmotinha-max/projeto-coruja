const veiculoService = require('../services/veiculos.service');

// Controlador responsável por lidar com a camada HTTP do cadastro de veículos.
async function criar(req, res, next) {
  try {
    const veiculo = await veiculoService.criar(req.body || {}, req.files || []);
    return res.status(201).json(veiculo);
  } catch (error) {
    return next(error);
  }
}

async function listar(_req, res, next) {
  try {
    const veiculos = await veiculoService.listar();
    return res.json(veiculos);
  } catch (error) {
    return next(error);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const veiculo = await veiculoService.buscarPorId(req.params.id);
    return res.json(veiculo);
  } catch (error) {
    return next(error);
  }
}

module.exports = { criar, listar, buscarPorId };
