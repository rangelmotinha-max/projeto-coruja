-- Migração 011: telefones como fonte oficial
PRAGMA foreign_keys=ON;

-- Remove entradas duplicadas na tabela de telefones mantendo o registro mais antigo
DELETE FROM telefones
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM telefones
  GROUP BY pessoa_id, LOWER(TRIM(numero))
);

-- Normaliza espaços extras para facilitar comparações futuras
UPDATE telefones
SET numero = TRIM(numero)
WHERE numero != TRIM(numero);

-- Migra valores legados de pessoas.telefone para a tabela normalizada, evitando duplicatas
INSERT INTO telefones (id, pessoa_id, numero, criadoEm, atualizadoEm)
SELECT
  lower(hex(randomblob(16))),
  p.id,
  TRIM(p.telefone),
  COALESCE(p.criadoEm, datetime('now')),
  datetime('now')
FROM pessoas p
WHERE p.telefone IS NOT NULL
  AND TRIM(p.telefone) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM telefones t
    WHERE t.pessoa_id = p.id
      AND LOWER(TRIM(t.numero)) = LOWER(TRIM(p.telefone))
  );

-- Impede duplicação futura de números por pessoa
CREATE UNIQUE INDEX IF NOT EXISTS idx_telefones_pessoa_numero
  ON telefones(pessoa_id, numero COLLATE NOCASE);

-- Remove a coluna legado telefone recriando a tabela de pessoas sem alterar FKs
PRAGMA foreign_keys=OFF;
CREATE TABLE pessoas_nova (
  id TEXT PRIMARY KEY,
  nomeCompleto TEXT NOT NULL,
  apelido TEXT,
  dataNascimento TEXT,
  idade INTEGER,
  cpf TEXT,
  rg TEXT,
  cnh TEXT,
  nomeMae TEXT,
  nomePai TEXT,
  sinais TEXT,
  endereco_atual_index INTEGER DEFAULT 0,
  vinculos_json TEXT,
  ocorrencias_json TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL
);

INSERT INTO pessoas_nova (
  id, nomeCompleto, apelido, dataNascimento, idade, cpf, rg, cnh, nomeMae, nomePai, sinais,
  endereco_atual_index, vinculos_json, ocorrencias_json, criadoEm, atualizadoEm
)
SELECT
  id, nomeCompleto, apelido, dataNascimento, idade, cpf, rg, cnh, nomeMae, nomePai, sinais,
  endereco_atual_index, vinculos_json, ocorrencias_json, criadoEm, atualizadoEm
FROM pessoas;

DROP TABLE pessoas;
ALTER TABLE pessoas_nova RENAME TO pessoas;
PRAGMA foreign_keys=ON;
