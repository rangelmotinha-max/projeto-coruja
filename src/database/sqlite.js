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
      dataNascimento TEXT,
      cpf TEXT,
      rg TEXT,
      cnh TEXT,
      nomeMae TEXT,
      nomePai TEXT,
      telefone TEXT,
      endereco_atual_index INTEGER DEFAULT 0,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL
    )
  `);

  // Tabela de endereços com relacionamento 1:N com pessoas
  await db.run(`
    CREATE TABLE IF NOT EXISTS enderecos (
      id TEXT PRIMARY KEY,
      pessoa_id TEXT NOT NULL,
      uf TEXT,
      logradouro TEXT,
      bairro TEXT,
      complemento TEXT,
      cep TEXT,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
    )
  `);

  // Criar índice para queries de endereços por pessoa
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_enderecos_pessoa_id ON enderecos(pessoa_id)
  `);

  // Tentar adicionar coluna endereco_atual_index se ela não existir (para bancos existentes)
  try {
    await db.run(`
      ALTER TABLE pessoas ADD COLUMN endereco_atual_index INTEGER DEFAULT 0
    `);
  } catch (err) {
    // Coluna já existe, ignorar erro
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
  }

  // Tentar adicionar coluna complemento nos endereços para retrocompatibilidade
  try {
    await db.run(`
      ALTER TABLE enderecos ADD COLUMN complemento TEXT
    `);
  } catch (err) {
    // Coluna já existe, ignorar erro
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
  }
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
