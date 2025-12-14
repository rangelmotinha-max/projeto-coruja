const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../src/database/sqlite');
const veiculosService = require('../src/services/veiculos.service');
const pessoasService = require('../src/services/pessoas.service');
const VeiculoModel = require('../src/models/veiculos.model');
const VeiculoPessoaModel = require('../src/models/veiculos-pessoas.model');

// Limpa tabelas para isolar cenários de busca
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
  await db.run('DELETE FROM veiculos_pessoas');
  await db.run('DELETE FROM veiculos');
  await db.run('DELETE FROM pessoas');
}

test.beforeEach(async () => {
  // Comentário: garante base limpa entre execuções
  await limparBanco();
});

test('consulta combina veiculos e veiculos_pessoas sem duplicar por placa', async () => {
  // Cria registros equivalentes nas duas tabelas para verificar a mesclagem
  const pessoa = await pessoasService.criar({
    nomeCompleto: 'João Consulta',
    dataNascimento: '1990-01-01',
  });

  await VeiculoModel.create({
    nomeProprietario: 'Registro Livre',
    cpf: '39053344705',
    placa: 'ABC1D23',
    marcaModelo: 'Sedan',
    cor: 'Azul',
  });

  await VeiculoPessoaModel.create({
    pessoaId: pessoa.id,
    nomeProprietario: 'João Consulta',
    cpf: '39053344705',
    placa: 'ABC1D23',
    marcaModelo: 'SUV',
    cor: 'Vermelho',
  });

  const resultado = await veiculosService.buscar({ placa: 'abc1d23' });

  assert.equal(resultado.length, 1, 'Deve retornar um resultado unificado por placa');
  assert.equal(resultado[0].placa, 'ABC1D23');
  assert.equal(resultado[0].cpf, '39053344705');
  assert.equal(resultado[0].marcaModelo, 'SUV');
  assert.equal(resultado[0].nomeProprietario, 'João Consulta');
});

test('consulta respeita filtros múltiplos e retorna vazio quando não há correspondência', async () => {
  // Popula dados variados para validar filtros de CPF e marca/modelo
  await VeiculoModel.create({
    nomeProprietario: 'Maria Livre',
    cpf: '12345678909',
    placa: 'BBB1B22',
    marcaModelo: 'Hatch',
    cor: 'Prata',
  });

  const pessoa = await pessoasService.criar({
    nomeCompleto: 'Carlos Vinculo',
    cpf: '39053344705',
    dataNascimento: '1988-12-01',
  });

  await VeiculoPessoaModel.create({
    pessoaId: pessoa.id,
    nomeProprietario: 'Carlos Vinculo',
    cpf: '39053344705',
    placa: 'CCC1C33',
    marcaModelo: 'Pickup',
    cor: 'Preto',
  });

  const filtrado = await veiculosService.buscar({ cpf: '390.533.447-05', marcaModelo: 'pickup' });
  assert.equal(filtrado.length, 1, 'Filtro combinado deve trazer apenas um veículo');
  assert.equal(filtrado[0].placa, 'CCC1C33');
  assert.equal(filtrado[0].nomeProprietario, 'Carlos Vinculo');

  const vazio = await veiculosService.buscar({ placa: 'ZZZ9Z99' });
  assert.deepEqual(vazio, [], 'Busca sem correspondência deve retornar lista vazia');
});
