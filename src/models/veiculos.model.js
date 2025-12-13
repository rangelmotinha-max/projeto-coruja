const { initDatabase } = require('../database/sqlite');

async function listAll() {
  const db = await initDatabase();
  // SQLite não suporta "NULLS LAST"; usar ordenação simples por atualizadoEm e criadoEm
  return db.all('SELECT * FROM veiculos ORDER BY atualizadoEm DESC, criadoEm DESC');
}

async function getByPlaca(placa) {
  const db = await initDatabase();
  return db.get('SELECT * FROM veiculos WHERE placa = ?', [placa]);
}

async function create(veic) {
  const db = await initDatabase();
  const stmt = await db.run(
    'INSERT INTO veiculos (proprietario, cpfProprietario, marcaModelo, placa, cor, anoModelo, criadoEm, atualizadoEm) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      veic.proprietario,
      veic.cpfProprietario,
      veic.marcaModelo,
      veic.placa,
      veic.cor || null,
      veic.anoModelo || null,
      new Date().toISOString(),
      new Date().toISOString(),
    ]
  );
  return { id: stmt.lastID, ...veic };
}

async function update(id, veic) {
  const db = await initDatabase();
  await db.run(
    'UPDATE veiculos SET proprietario = ?, cpfProprietario = ?, marcaModelo = ?, placa = ?, cor = ?, anoModelo = ?, atualizadoEm = ? WHERE id = ?',
    [
      veic.proprietario,
      veic.cpfProprietario,
      veic.marcaModelo,
      veic.placa,
      veic.cor || null,
      veic.anoModelo || null,
      new Date().toISOString(),
      id,
    ]
  );
  return { id, ...veic };
}

async function remove(id) {
  const db = await initDatabase();
  await db.run('DELETE FROM veiculos WHERE id = ?', [id]);
}

module.exports = { listAll, getByPlaca, create, update, remove };