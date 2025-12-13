const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

// Modelo de veículos utilizado tanto pelo cadastro dedicado quanto pelos vínculos de pessoas.
// Mantém proprietário e CPF cadastrados junto aos dados básicos do veículo.
async function listAll() {
  const db = await initDatabase();
  return db.all(
    'SELECT * FROM veiculos ORDER BY atualizadoEm DESC, criadoEm DESC'
  );
}

async function getByPlaca(placa) {
  const db = await initDatabase();
  return db.get('SELECT * FROM veiculos WHERE placa = ?', [placa]);
}

async function create(veiculo) {
  const db = await initDatabase();
  const agora = new Date().toISOString();
  const novo = {
    id: randomUUID(),
    pessoa_id: veiculo.pessoa_id || null,
    proprietario: veiculo.proprietario || null,
    cpfProprietario: veiculo.cpfProprietario || null,
    marcaModelo: veiculo.marcaModelo || null,
    placa: veiculo.placa || null,
    cor: veiculo.cor || null,
    anoModelo: veiculo.anoModelo || null,
    criadoEm: agora,
    atualizadoEm: agora,
  };

  await db.run(
    `INSERT INTO veiculos (id, pessoa_id, proprietario, cpfProprietario, marcaModelo, placa, cor, anoModelo, criadoEm, atualizadoEm)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      novo.id,
      novo.pessoa_id,
      novo.proprietario,
      novo.cpfProprietario,
      novo.marcaModelo,
      novo.placa,
      novo.cor,
      novo.anoModelo,
      novo.criadoEm,
      novo.atualizadoEm,
    ]
  );

  return novo;
}

async function update(id, veiculo) {
  const db = await initDatabase();
  const agora = new Date().toISOString();
  await db.run(
    `UPDATE veiculos
      SET pessoa_id = ?, proprietario = ?, cpfProprietario = ?, marcaModelo = ?, placa = ?, cor = ?, anoModelo = ?, atualizadoEm = ?
      WHERE id = ?`,
    [
      veiculo.pessoa_id || null,
      veiculo.proprietario || null,
      veiculo.cpfProprietario || null,
      veiculo.marcaModelo || null,
      veiculo.placa || null,
      veiculo.cor || null,
      veiculo.anoModelo || null,
      agora,
      id,
    ]
  );

  return { id, ...veiculo, atualizadoEm: agora };
}

async function updateOwnerData(veiculoId, pessoaId, proprietario, cpfProprietario) {
  // Função usada ao vincular um veículo existente a uma pessoa.
  const db = await initDatabase();
  const agora = new Date().toISOString();
  await db.run(
    `UPDATE veiculos
       SET pessoa_id = ?, proprietario = ?, cpfProprietario = ?, atualizadoEm = ?
     WHERE id = ?`,
    [pessoaId || null, proprietario || null, cpfProprietario || null, agora, veiculoId]
  );
}

async function remove(id) {
  const db = await initDatabase();
  await db.run('DELETE FROM veiculos WHERE id = ?', [id]);
}

module.exports = { listAll, getByPlaca, create, update, updateOwnerData, remove };
