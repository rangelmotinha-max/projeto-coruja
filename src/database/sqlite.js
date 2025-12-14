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
    exec(sql) {
      // Executa múltiplas instruções SQL em bloco (útil para migrações)
      return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    },
  };
}

async function applyPendingMigrations(db) {
  const migrationsDir = path.join(__dirname, '../../database/migrations');

  // Garante que as constraints de chave estrangeira estejam ativas
  await db.run('PRAGMA foreign_keys = ON');

  // Tabela de controle de versão das migrações
  await db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const alreadyApplied = await db.get('SELECT 1 FROM _migrations WHERE name = ?', [file]);
    if (alreadyApplied) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Remove linhas de comentário para evitar quebras na divisão das sentenças
    const normalized = sql
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');

    // Divide o arquivo em sentenças SQL individuais
    const statements = normalized
      .split(/;\s*(?:\r?\n|$)/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    console.info(`[migrations] Aplicando ${file}`);

    try {
      for (const statement of statements) {
        try {
          await db.run(statement);
        } catch (err) {
          const isDuplicateError =
            err.message.includes('duplicate column name') || err.message.includes('already exists');

          if (isDuplicateError) {
            console.warn(`[migrations] Aviso em ${file}: ${err.message}`);
            continue;
          }

          throw err;
        }
      }

      await db.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
      console.info(`[migrations] ${file} aplicada com sucesso.`);
    } catch (err) {
      console.error(`[migrations] Falha ao aplicar ${file}: ${err.message}`);
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
      try {
        // Dispara executor de migrações baseado em arquivos numerados
        await applyPendingMigrations(db);
      } catch (err) {
        console.error('[database] Falha ao inicializar migrações SQLite');
        console.error(err.message);
        throw err;
      }
      return db;
    });
  }

  return dbPromise;
}

module.exports = { initDatabase, dbPath };
