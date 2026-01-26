const entidadesService = require('../services/entidades.service');

// Converte campos que podem chegar como string JSON para estruturas nativas
function normalizarPayload(req) {
  const payload = { ...req.body };
  const camposJson = ['telefones', 'enderecos', 'liderancas', 'fotosParaRemover'];

  camposJson.forEach((campo) => {
    if (typeof payload[campo] === 'string') {
      try {
        payload[campo] = JSON.parse(payload[campo]);
      } catch (_) {
        payload[campo] = [payload[campo]];
      }
    }
  });

  if (payload.nome !== undefined) payload.nome = String(payload.nome || '').trim();
  if (payload.cnpj !== undefined) payload.cnpj = String(payload.cnpj || '').trim();
  if (payload.descricao !== undefined) payload.descricao = String(payload.descricao || '').trim();

  return payload;
}

async function criar(req, res, next) {
  try {
    const payload = normalizarPayload(req);
    const entidade = await entidadesService.criar(payload, req.files || []);
    return res.status(201).json(entidade);
  } catch (error) {
    return next(error);
  }
}

async function listar(req, res, next) {
  try {
    const entidades = await entidadesService.listar(req.query || {});
    return res.json(entidades);
  } catch (error) {
    return next(error);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const entidade = await entidadesService.buscarPorId(req.params.id);
    return res.json(entidade);
  } catch (error) {
    return next(error);
  }
}

async function atualizar(req, res, next) {
  try {
    const payload = normalizarPayload(req);
    const entidade = await entidadesService.atualizar(req.params.id, payload, req.files || []);
    return res.json(entidade);
  } catch (error) {
    return next(error);
  }
}

async function remover(req, res, next) {
  try {
    await entidadesService.remover(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function listarLiderancas(req, res, next) {
  try {
    const liderancas = await entidadesService.listarLiderancas(req.params.id);
    return res.json(liderancas);
  } catch (error) {
    return next(error);
  }
}

async function adicionarLideranca(req, res, next) {
  try {
    const lideranca = await entidadesService.adicionarLideranca(req.params.id, req.body || {});
    return res.status(201).json(lideranca);
  } catch (error) {
    return next(error);
  }
}

async function atualizarLideranca(req, res, next) {
  try {
    const lideranca = await entidadesService.atualizarLideranca(
      req.params.id,
      req.params.liderancaId,
      req.body || {},
    );
    return res.json(lideranca);
  } catch (error) {
    return next(error);
  }
}

async function removerLideranca(req, res, next) {
  try {
    await entidadesService.removerLideranca(req.params.id, req.params.liderancaId);
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
  listarLiderancas,
  adicionarLideranca,
  atualizarLideranca,
  removerLideranca,
};
