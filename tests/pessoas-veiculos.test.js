const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../src/database/sqlite');
const pessoasService = require('../src/services/pessoas.service');
const VeiculoModel = require('../src/models/veiculos.model');

// Limpa tabelas afetadas para isolar cada cenário de teste
async function limparBanco() {
  const db = await initDatabase();
  await db.run('DELETE FROM fotos_pessoas');
  await db.run('DELETE FROM enderecos');
  await db.run('DELETE FROM telefones');
  await db.run('DELETE FROM emails');
  await db.run('DELETE FROM redes_sociais');
  await db.run('DELETE FROM vinculos_pessoas');
  await db.run('DELETE FROM socios');
  await db.run('DELETE FROM empresas');
  await db.run('DELETE FROM veiculos');
  await db.run('DELETE FROM pessoas');
}

test.beforeEach(async () => {
  // Garante base limpa antes de cada caso
  await limparBanco();
});

test('criar pessoa com veículo sincroniza veiculos e retorna dados completos', async () => {
  // Executa criação com veículo sem CPF/nome para validar preenchimento herdado
  const pessoaCriada = await pessoasService.criar({
    nomeCompleto: 'Fulano Teste',
    dataNascimento: '1990-05-10',
    veiculo: {
      placa: 'ABC1D23',
      marcaModelo: 'Sedan',
      cor: 'Azul',
    },
  });

  // Confirma que o retorno já vem hidratado com veículo associado
  assert.ok(pessoaCriada.veiculo, 'Veículo deveria ser retornado junto à pessoa');
  assert.equal(pessoaCriada.veiculo.placa, 'ABC1D23');
  assert.equal(pessoaCriada.veiculo.nomeProprietario, 'Fulano Teste');

  // Confirma persistência do registro na tabela de veículos
  const veiculoBanco = await VeiculoModel.findByPlaca('ABC1D23');
  assert.ok(veiculoBanco, 'Veículo deve existir no banco após criação');
});

test('atualizar pessoa com veículo reaproveita vínculo existente e devolve alteração', async () => {
  // Cria base inicial com veículo associado
  const pessoaCriada = await pessoasService.criar({
    nomeCompleto: 'Fulano Teste',
    dataNascimento: '1990-05-10',
    veiculo: {
      placa: 'ABC1D23',
      marcaModelo: 'Sedan',
      cor: 'Azul',
    },
  });

  // Atualiza veículo reaproveitando CPF/nome do cadastro
  const pessoaAtualizada = await pessoasService.atualizar(pessoaCriada.id, {
    veiculo: {
      placa: 'ABC1D23',
      cor: 'Vermelho',
    },
  });

  // Resposta deve refletir a alteração do veículo
  assert.ok(pessoaAtualizada.veiculo, 'Veículo deve ser retornado após atualização');
  assert.equal(pessoaAtualizada.veiculo.cor, 'Vermelho');

  // Verifica que o registro único de veículo foi atualizado e não duplicado
  const veiculoBanco = await VeiculoModel.findByPlaca('ABC1D23');
  assert.equal(veiculoBanco.cor, 'Vermelho');
  assert.equal(veiculoBanco.nomeProprietario, 'Fulano Teste');
});
