-- Tabelas de Entidades com contatos, endereços e fotos vinculadas
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS entidades (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  liderancas_json TEXT,
  descricao TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entidades_cnpj ON entidades(cnpj) WHERE cnpj IS NOT NULL;

CREATE TABLE IF NOT EXISTS entidades_telefones (
  id TEXT PRIMARY KEY,
  entidade_id TEXT NOT NULL,
  numero TEXT NOT NULL,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (entidade_id) REFERENCES entidades(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_entidades_telefones_entidade ON entidades_telefones(entidade_id);

CREATE TABLE IF NOT EXISTS entidades_enderecos (
  id TEXT PRIMARY KEY,
  entidade_id TEXT NOT NULL,
  logradouro TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  complemento TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (entidade_id) REFERENCES entidades(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_entidades_enderecos_entidade ON entidades_enderecos(entidade_id);

CREATE TABLE IF NOT EXISTS entidades_fotos (
  id TEXT PRIMARY KEY,
  entidade_id TEXT NOT NULL,
  nome_arquivo TEXT,
  caminho TEXT NOT NULL,
  mime_type TEXT,
  tamanho INTEGER,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (entidade_id) REFERENCES entidades(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_entidades_fotos_entidade ON entidades_fotos(entidade_id);
