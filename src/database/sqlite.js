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
  // Garantir integridade referencial
  try {
    await db.run('PRAGMA foreign_keys = ON');
  } catch (_) {}

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
      apelido TEXT,
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
      -- Guarda latitude e longitude informadas manualmente
      lat_long TEXT,
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

  // Tabela de fotos vinculadas a pessoas (permite múltiplas imagens por cadastro)
  await db.run(`
    CREATE TABLE IF NOT EXISTS fotos_pessoas (
      id TEXT PRIMARY KEY,
      pessoa_id TEXT NOT NULL,
      nome_arquivo TEXT,
      caminho TEXT NOT NULL,
      mime_type TEXT,
      tamanho INTEGER,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_fotos_pessoa_id ON fotos_pessoas(pessoa_id)
  `);

  // Tabela de telefones com relacionamento 1:N com pessoas
  await db.run(`
    CREATE TABLE IF NOT EXISTS telefones (
      id TEXT PRIMARY KEY,
      pessoa_id TEXT NOT NULL,
      numero TEXT NOT NULL,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
    )
  `);

  // Criar índice para queries de telefones por pessoa
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_telefones_pessoa_id ON telefones(pessoa_id)
  `);

  // Tabela de emails com relacionamento 1:N com pessoas
  await db.run(`
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      pessoa_id TEXT NOT NULL,
      email TEXT NOT NULL,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_emails_pessoa_id ON emails(pessoa_id)
  `);

  // Tabela de redes sociais com relacionamento 1:N com pessoas
  await db.run(`
    CREATE TABLE IF NOT EXISTS redes_sociais (
      id TEXT PRIMARY KEY,
      pessoa_id TEXT NOT NULL,
      perfil TEXT NOT NULL,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_redes_pessoa_id ON redes_sociais(pessoa_id)
  `);

  // Tabela de dados de empresa (1:1) com pessoa
  await db.run(`
    CREATE TABLE IF NOT EXISTS empresas (
      id TEXT PRIMARY KEY,
      pessoa_id TEXT NOT NULL UNIQUE,
      cnpj TEXT,
      razaoSocial TEXT,
      nomeFantasia TEXT,
      naturezaJuridica TEXT,
      dataInicioAtividade TEXT,
      situacaoCadastral TEXT,
      cep TEXT,
      endereco TEXT,
      telefone TEXT,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
    )
  `);

  // Sócios da empresa (1:N)
  await db.run(`
    CREATE TABLE IF NOT EXISTS socios (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      nome TEXT,
      cpf TEXT,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_socios_empresa_id ON socios(empresa_id)
  `);

  // Tabela de veículos com relacionamento 1:N com pessoas (pessoa_id opcional para veículos avulsos)
  const veiculosInfo = await db.all("PRAGMA table_info('veiculos')");
  const veiculosExiste = veiculosInfo && veiculosInfo.length > 0;

  const criarTabelaVeiculos = async () => {
    await db.run(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id TEXT PRIMARY KEY,
        pessoa_id TEXT NULL,
        proprietario TEXT,
        cpfProprietario TEXT,
        marcaModelo TEXT,
        placa TEXT UNIQUE,
        cor TEXT,
        anoModelo TEXT,
        criadoEm TEXT NOT NULL,
        atualizadoEm TEXT NOT NULL,
        FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE SET NULL
      )
    `);

    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_veiculos_pessoa_id ON veiculos(pessoa_id)`
    );
  };

  if (!veiculosExiste) {
    // Banco novo: cria a tabela já com as colunas necessárias e vínculo opcional
    await criarTabelaVeiculos();
  } else {
    // Banco existente: se faltar coluna ou pessoa_id estiver NOT NULL, recria a tabela preservando dados
    const colunas = veiculosInfo.map((c) => c.name);
    const pessoaObrigatoria = veiculosInfo.some((c) => c.name === 'pessoa_id' && c.notnull === 1);
    const precisaMigrar =
      pessoaObrigatoria ||
      !colunas.includes('proprietario') ||
      !colunas.includes('cpfProprietario') ||
      !veiculosInfo.some((c) => c.name === 'placa' && c.pk === 0);

    if (precisaMigrar) {
      await db.run(`
        CREATE TABLE IF NOT EXISTS veiculos_tmp (
          id TEXT PRIMARY KEY,
          pessoa_id TEXT NULL,
          proprietario TEXT,
          cpfProprietario TEXT,
          marcaModelo TEXT,
          placa TEXT UNIQUE,
          cor TEXT,
          anoModelo TEXT,
          criadoEm TEXT NOT NULL,
          atualizadoEm TEXT NOT NULL,
          FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE SET NULL
        )
      `);

      // Copia dados existentes preenchendo colunas novas com NULL
      const exprId = colunas.includes('id') ? 'id' : "lower(hex(randomblob(16)))";
      const exprPessoa = colunas.includes('pessoa_id') ? 'pessoa_id' : 'NULL';
      const exprProp = colunas.includes('proprietario') ? 'proprietario' : 'NULL';
      const exprCpf = colunas.includes('cpfProprietario') ? 'cpfProprietario' : 'NULL';
      const exprMarca = colunas.includes('marcaModelo') ? 'marcaModelo' : 'NULL';
      const exprPlaca = colunas.includes('placa') ? 'placa' : 'NULL';
      const exprCor = colunas.includes('cor') ? 'cor' : 'NULL';
      const exprAno = colunas.includes('anoModelo') ? 'anoModelo' : 'NULL';
      const exprCriado = colunas.includes('criadoEm') ? 'criadoEm' : "datetime('now')";
      const exprAtual = colunas.includes('atualizadoEm') ? 'atualizadoEm' : "datetime('now')";

      await db.run(
        `INSERT OR IGNORE INTO veiculos_tmp (
          id, pessoa_id, proprietario, cpfProprietario, marcaModelo, placa, cor, anoModelo, criadoEm, atualizadoEm
        )
        SELECT ${exprId}, ${exprPessoa}, ${exprProp}, ${exprCpf}, ${exprMarca}, ${exprPlaca}, ${exprCor}, ${exprAno}, ${exprCriado}, ${exprAtual}
        FROM veiculos`
      );

      await db.run('DROP TABLE veiculos');
      await db.run('ALTER TABLE veiculos_tmp RENAME TO veiculos');
      await db.run(
        `CREATE INDEX IF NOT EXISTS idx_veiculos_pessoa_id ON veiculos(pessoa_id)`
      );
    } else {
      // Caso já tenha as colunas, apenas garante o índice
      await db.run(
        `CREATE INDEX IF NOT EXISTS idx_veiculos_pessoa_id ON veiculos(pessoa_id)`
      );
    }
  }

  // Tabela de vínculos de pessoas (pessoas relacionadas)
  await db.run(`
    CREATE TABLE IF NOT EXISTS vinculos_pessoas (
      id TEXT PRIMARY KEY,
      pessoa_id TEXT NOT NULL,
      nome TEXT,
      cpf TEXT,
      tipo TEXT,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_vinc_pessoas_pessoa_id ON vinculos_pessoas(pessoa_id)
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

  // Tentar adicionar coluna apelido, caso o banco já exista sem ela
  try {
    await db.run(`
      ALTER TABLE pessoas ADD COLUMN apelido TEXT
    `);
  } catch (err) {
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

  // Tenta adicionar coluna de latitude/longitude para bancos antigos
  try {
    await db.run(`
      ALTER TABLE enderecos ADD COLUMN lat_long TEXT
    `);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
  }

  // Adicionar coluna cep na tabela empresas caso não exista
  try {
    await db.run(`
      ALTER TABLE empresas ADD COLUMN cep TEXT
    `);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
  }

  // Adicionar colunas JSON para vinculos e ocorrencias na tabela pessoas
  try {
    await db.run(`
      ALTER TABLE pessoas ADD COLUMN vinculos_json TEXT
    `);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
  }
  try {
    await db.run(`
      ALTER TABLE pessoas ADD COLUMN ocorrencias_json TEXT
    `);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
  }

  // Adicionar coluna idade na tabela pessoas para persistir valor calculado
  try {
    await db.run(`
      ALTER TABLE pessoas ADD COLUMN idade INTEGER
    `);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
  }

  // Empresas independentes (cadastro geral) e seus sócios
  await db.run(`
    CREATE TABLE IF NOT EXISTS empresas_cadastro (
      id TEXT PRIMARY KEY,
      cnpj TEXT,
      razaoSocial TEXT,
      nomeFantasia TEXT,
      naturezaJuridica TEXT,
      dataInicioAtividade TEXT,
      situacaoCadastral TEXT,
      endereco TEXT,
      cep TEXT,
      telefone TEXT,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS socios_cadastro (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL,
      nome TEXT,
      cpf TEXT,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      FOREIGN KEY (empresa_id) REFERENCES empresas_cadastro(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_socios_cadastro_empresa_id ON socios_cadastro(empresa_id)
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
