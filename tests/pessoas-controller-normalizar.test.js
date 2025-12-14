const test = require('node:test');
const assert = require('node:assert/strict');
const pessoasController = require('../src/controllers/pessoas.controller');
const pessoaService = require('../src/services/pessoas.service');

test('normalizarPayload converte veículos enviados como string JSON', async () => {
  const originalAtualizar = pessoaService.atualizar;
  let payloadCapturado;

  // Comentário: stub do serviço para capturar o payload sem acessar o banco
  pessoaService.atualizar = async (id, payload) => {
    payloadCapturado = payload;
    return { id, recebido: true };
  };

  const listaVeiculos = [{ placa: 'AAA1A11', cor: 'Prata', marcaModelo: 'Hatch' }];
  const req = {
    params: { id: '123' },
    body: {
      veiculos: JSON.stringify(listaVeiculos),
      veiculo: JSON.stringify({ placa: 'BBB2B22', cor: 'Azul' }),
      nomeCompleto: 'Pessoa FormData',
    },
    files: [],
  };

  const res = { json: (data) => data };
  const next = (err) => {
    throw err;
  };

  try {
    await pessoasController.atualizar(req, res, next);
  } finally {
    // Comentário: garante que o serviço original seja restaurado para demais testes
    pessoaService.atualizar = originalAtualizar;
  }

  assert.deepEqual(payloadCapturado.veiculos, listaVeiculos);
  assert.equal(payloadCapturado.veiculo.placa, 'BBB2B22');
});

test('normalizarPayload mantém valor bruto quando parse falha', async () => {
  const originalAtualizar = pessoaService.atualizar;
  let payloadCapturado;

  // Comentário: stub do serviço para inspecionar o payload mesmo com JSON inválido
  pessoaService.atualizar = async (id, payload) => {
    payloadCapturado = payload;
    return { id, recebido: true };
  };

  const req = {
    params: { id: '321' },
    body: {
      veiculos: 'não é json',
      nomeCompleto: 'Falha Parse',
    },
    files: [],
  };

  const res = { json: (data) => data };
  const next = (err) => {
    throw err;
  };

  try {
    await pessoasController.atualizar(req, res, next);
  } finally {
    pessoaService.atualizar = originalAtualizar;
  }

  assert.equal(payloadCapturado.veiculos, 'não é json');
});
