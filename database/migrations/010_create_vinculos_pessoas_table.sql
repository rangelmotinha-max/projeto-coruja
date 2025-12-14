-- Cria tabela de vínculos diretos entre pessoas
PRAGMA foreign_keys=ON;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS vinculos_pessoas (
  id TEXT PRIMARY KEY,
  pessoa_id TEXT NOT NULL,
  nome TEXT,
  cpf TEXT,
  tipo TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vinculos_pessoas_pessoa_id ON vinculos_pessoas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_pessoas_cpf ON vinculos_pessoas(cpf);

COMMIT;
