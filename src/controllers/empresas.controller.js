const empresasService = require('../services/empresas.service');

async function criar(req, res, next) {
  try {
    const empresa = await empresasService.criar(req.body, req.files || {});
    return res.status(201).json(empresa);
  } catch (error) { return next(error); }
}

async function listar(req, res, next) {
  try {
    const lista = await empresasService.listar(req.query || {});
    return res.json(lista);
  } catch (error) { return next(error); }
}

async function buscarPorId(req, res, next) {
  try {
    const emp = await empresasService.buscarPorId(req.params.id);
    return res.json(emp);
  } catch (error) { return next(error); }
}

async function atualizar(req, res, next) {
  try {
    const emp = await empresasService.atualizar(req.params.id, req.body, req.files || {});
    return res.json(emp);
  } catch (error) { return next(error); }
}

async function remover(req, res, next) {
  try {
    await empresasService.remover(req.params.id);
    return res.status(204).send();
  } catch (error) { return next(error); }
}

module.exports = { criar, listar, buscarPorId, atualizar, remover };
