const faccaoService = require('../services/faccoes.service');

// Lista facções com filtro opcional de busca
async function listar(req, res, next) {
  try {
    const termo = req.query?.busca || req.query?.q || '';
    const faccoes = await faccaoService.listar(termo);
    return res.json(faccoes);
  } catch (error) {
    return next(error);
  }
}

// Cria nova facção/organização
async function criar(req, res, next) {
  try {
    const faccao = await faccaoService.criar(req.body || {});
    return res.status(201).json(faccao);
  } catch (error) {
    return next(error);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const faccao = await faccaoService.buscarPorId(req.params.id);
    return res.json(faccao);
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, criar, buscarPorId };
