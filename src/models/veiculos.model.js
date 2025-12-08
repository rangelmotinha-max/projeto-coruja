const db = require('../database/sqlite');

const createTableSQL = `
CREATE TABLE IF NOT EXISTS veiculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proprietario TEXT NOT NULL,
  cpfProprietario TEXT NOT NULL,
  marcaModelo TEXT NOT NULL,
  placa TEXT NOT NULL UNIQUE,
  cor TEXT,
  anoModelo TEXT,
  criadoEm DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizadoEm DATETIME
);
`;

async function init() {
  await db.exec(createTableSQL);
}

async function listAll() {
  return db.all('SELECT * FROM veiculos ORDER BY atualizadoEm DESC NULLS LAST, criadoEm DESC');
}

async function getByPlaca(placa) {
  return db.get('SELECT * FROM veiculos WHERE placa = ?', [placa]);
}

async function create(veic) {
  const stmt = await db.run(
    'INSERT INTO veiculos (proprietario, cpfProprietario, marcaModelo, placa, cor, anoModelo) VALUES (?, ?, ?, ?, ?, ?)',
    [veic.proprietario, veic.cpfProprietario, veic.marcaModelo, veic.placa, veic.cor || null, veic.anoModelo || null]
  );
  return { id: stmt.lastID, ...veic };
}

async function update(id, veic) {
  await db.run(
    'UPDATE veiculos SET proprietario=?, cpfProprietario=?, marcaModelo=?, placa=?, cor=?, anoModelo=?, atualizadoEm=CURRENT_TIMESTAMP WHERE id=?',
    [veic.proprietario, veic.cpfProprietario, veic.marcaModelo, veic.placa, veic.cor || null, veic.anoModelo || null, id]
  );
  return { id, ...veic };
}

async function remove(id) {
  await db.run('DELETE FROM veiculos WHERE id = ?', [id]);
}

module.exports = { init, listAll, getByPlaca, create, update, remove };