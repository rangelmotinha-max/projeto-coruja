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

test('criar pessoa com múltiplos veículos mantém todos os registros vinculados', async () => {
  // Cria cadastro com dois veículos distintos para o mesmo titular
  const pessoaCriada = await pessoasService.criar({
    nomeCompleto: 'Maria Motorista',
    dataNascimento: '1985-03-20',
    veiculos: [
      { placa: 'AAA1A11', cor: 'Prata', marcaModelo: 'Hatch' },
      { placa: 'BBB1B22', cor: 'Preto', marcaModelo: 'SUV' },
    ],
  });

  // Comentário: o retorno deve trazer ambos os veículos já hidratados
  assert.ok(Array.isArray(pessoaCriada.veiculos), 'Lista de veículos deve existir na resposta');
  assert.equal(pessoaCriada.veiculos.length, 2, 'Ambos os veículos precisam ser retornados');

  const primeiro = await VeiculoModel.findByPlaca('AAA1A11');
  const segundo = await VeiculoModel.findByPlaca('BBB1B22');
  assert.ok(primeiro, 'Primeiro veículo deve ter sido persistido');
  assert.ok(segundo, 'Segundo veículo deve ter sido persistido');
  assert.equal(primeiro.nomeProprietario, 'Maria Motorista');
  assert.equal(segundo.nomeProprietario, 'Maria Motorista');
});

test('pessoa com CPF recebe múltiplos veículos diferentes sem sobrescrever por CPF', async () => {
  // Garante que veículos com placas diferentes para o mesmo CPF sejam independentes
  const pessoaCriada = await pessoasService.criar({
    nomeCompleto: 'João Placas',
    cpf: '390.533.447-05',
    veiculos: [
      { placa: 'CCC1C33', cor: 'Branco', marcaModelo: 'Sedan' },
      { placa: 'DDD1D44', cor: 'Azul', marcaModelo: 'Pickup' },
    ],
  });

  // Comentário: ambos devem estar presentes no retorno e no banco
  assert.equal(pessoaCriada.veiculos.length, 2, 'Deve retornar dois veículos distintos');

  const terceiro = await VeiculoModel.findByPlaca('CCC1C33');
  const quarto = await VeiculoModel.findByPlaca('DDD1D44');
  assert.ok(terceiro, 'Primeiro veículo precisa existir no banco');
  assert.ok(quarto, 'Segundo veículo precisa existir no banco');
  assert.notEqual(terceiro.id, quarto.id, 'IDs de veículos diferentes não podem coincidir');
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
