const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../../database/database.sqlite');
let dbPromise;

function wrapDatabase(db) {
  return {
    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function callback(err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },
    get(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        });
      });
    },
    all(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });
    },
  };
}

async function runMigrations(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senhaHash TEXT NOT NULL,
      role TEXT NOT NULL,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL
    )
  `);

  // Tabela de pessoas centralizando dados civis e de contato.
  await db.run(`
    CREATE TABLE IF NOT EXISTS pessoas (
      id TEXT PRIMARY KEY,
      nomeCompleto TEXT NOT NULL,
      dataNascimento TEXT NOT NULL,
      cpf TEXT,
      rg TEXT,
      cnh TEXT,
      nomeMae TEXT,
      nomePai TEXT,
      telefone TEXT,
      ultimoUf TEXT,
      ultimoLogradouro TEXT,
      ultimoBairroCidade TEXT,
      ultimoCep TEXT,
      enderecoUf TEXT,
      enderecoLogradouro TEXT,
      enderecoBairroCidade TEXT,
      enderecoCep TEXT,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL
    )
  `);
}

async function initDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) return reject(err);
        resolve(wrapDatabase(db));
      });
    }).then(async (db) => {
      await runMigrations(db);
      return db;
    });
  }

  return dbPromise;
}

module.exports = { initDatabase, dbPath };
