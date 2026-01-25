const empresasService = require('../services/empresas.service');

// Normaliza payloads vindos de multipart/form-data convertendo campos JSON.
function normalizarPayload(req) {
  const payload = { ...req.body };
  const camposJson = [
    'enderecos',
    'socios',
    'veiculos',
    'fotosParaRemover',
    'fotosExistentes',
  ];

  camposJson.forEach((campo) => {
    if (typeof payload[campo] === 'string') {
      try {
        // Comentário: converte strings JSON enviadas via multipart para objetos/arrays
        payload[campo] = JSON.parse(payload[campo]);
      } catch (_) {
        // Mantém valor original caso não seja JSON; validação tratará
      }
    }
  });

  return payload;
}

async function criar(req, res, next) {
  try {
    const payload = normalizarPayload(req);
    const empresa = await empresasService.criar(payload, req.files || {});
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
    const payload = normalizarPayload(req);
    const emp = await empresasService.atualizar(req.params.id, payload, req.files || {});
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
