const pessoaService = require('../services/pessoas.service');

// Normaliza payloads vindos de multipart/form-data convertendo campos JSON.
function normalizarPayload(req) {
  const payload = { ...req.body };
  const camposJson = [
    'enderecos',
    'telefones',
    'emails',
    'redesSociais',
    'vinculos',
    'ocorrencias',
    'fotosParaRemover',
    'veiculos',
    'veiculo',
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

  // Coerção básica de campos de texto para evitar erros de trim quando multipart envia objetos
  if (payload.nomeCompleto !== undefined) {
    // Comentário: aceita array (FormData duplicado) e mantém apenas o primeiro valor normalizado
    const nomeCompletoNormalizado = Array.isArray(payload.nomeCompleto)
      ? payload.nomeCompleto[0]
      : payload.nomeCompleto;
    payload.nomeCompleto = String(nomeCompletoNormalizado || '').trim();
  }
  if (payload.apelido !== undefined) payload.apelido = String(payload.apelido || '').trim();
  if (payload.cpf !== undefined) payload.cpf = String(payload.cpf || '').trim();
  if (payload.rg !== undefined) payload.rg = String(payload.rg || '').trim();
  if (payload.cnh !== undefined) payload.cnh = String(payload.cnh || '').trim();
  if (payload.nomeMae !== undefined) payload.nomeMae = String(payload.nomeMae || '').trim();
  if (payload.nomePai !== undefined) payload.nomePai = String(payload.nomePai || '').trim();
  if (payload.sinais !== undefined) payload.sinais = String(payload.sinais || '').trim();

  return payload;
}

// Controlador HTTP direcionando fluxo para serviços e padronizando respostas.
async function criar(req, res, next) {
  try {
    const payload = normalizarPayload(req);
    const pessoa = await pessoaService.criar(payload, req.files || []);
    return res.status(201).json(pessoa);
  } catch (error) {
    return next(error);
  }
}

async function listar(req, res, next) {
  try {
    // Busca com filtros opcionais de nome/apelido, documento, data de nascimento, parentes e contatos.
    const pessoas = await pessoaService.buscar(req.query || {});
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
    const payload = normalizarPayload(req);
    const pessoa = await pessoaService.atualizar(req.params.id, payload, req.files || []);
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
