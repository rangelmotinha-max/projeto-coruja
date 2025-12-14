const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../src/database/sqlite');
const pessoasService = require('../src/services/pessoas.service');
const PessoaModel = require('../src/models/pessoas.model');
const VeiculoPessoaModel = require('../src/models/veiculos-pessoas.model');

// Limpa tabelas relacionadas para evitar interferência entre cenários
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
  await limparBanco();
});

test('falha em telefone interrompe criação e reverte todos os inserts', async () => {
  // Simula erro controlado durante a inserção de telefone para testar rollback
  const originalAdicionarTelefone = PessoaModel.adicionarTelefone;

  try {
    PessoaModel.adicionarTelefone = async (...args) => {
      // Comentário: o erro lançado aqui deve disparar o rollback completo
      throw new Error('falha simulada telefone');
    };

    await assert.rejects(
      () => pessoasService.criar({
        nomeCompleto: 'Rollback Telefones',
        enderecos: [{ uf: 'SP', logradouro: 'Rua A', bairro: 'Centro' }],
        telefones: ['11999990000'],
      }),
      /falha simulada telefone/,
    );
  } finally {
    PessoaModel.adicionarTelefone = originalAdicionarTelefone;
  }

  const db = await initDatabase();
  const { total: pessoas } = await db.get('SELECT COUNT(*) as total FROM pessoas');
  const { total: enderecos } = await db.get('SELECT COUNT(*) as total FROM enderecos');
  const { total: telefones } = await db.get('SELECT COUNT(*) as total FROM telefones');

  assert.equal(pessoas, 0, 'Cadastro principal precisa ser revertido');
  assert.equal(enderecos, 0, 'Endereços não devem permanecer após rollback');
  assert.equal(telefones, 0, 'Telefones não podem ser persistidos após erro');
});

test('erro ao salvar veículo desfaz pessoa e demais vínculos', async () => {
  // Força falha apenas no momento de salvar veículo para verificar reversão completa
  const originalCreateVeiculo = VeiculoPessoaModel.create;

  try {
    VeiculoPessoaModel.create = async (...args) => {
      // Comentário: lançamos erro para garantir que a transação seja revertida
      throw new Error('falha simulada veiculo');
    };

    await assert.rejects(
      () => pessoasService.criar({
        nomeCompleto: 'Rollback Veiculos',
        emails: ['teste@rollback.com'],
        veiculo: { placa: 'ZZZ9Z99', marcaModelo: 'Sedan' },
      }),
      /falha simulada veiculo/,
    );
  } finally {
    VeiculoPessoaModel.create = originalCreateVeiculo;
  }

  const db = await initDatabase();
  const { total: pessoas } = await db.get('SELECT COUNT(*) as total FROM pessoas');
  const { total: emails } = await db.get('SELECT COUNT(*) as total FROM emails');
  const { total: veiculos } = await db.get('SELECT COUNT(*) as total FROM veiculos_pessoas');

  assert.equal(pessoas, 0, 'Pessoa não deve existir após falha de veículo');
  assert.equal(emails, 0, 'Emails inseridos antes do erro precisam ser revertidos');
  assert.equal(veiculos, 0, 'Tabela de veículos não deve registrar dados após rollback');
});
