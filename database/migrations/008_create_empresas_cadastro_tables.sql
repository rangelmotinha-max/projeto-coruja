-- Tabelas de empresas independentes e seus sócios
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
);

CREATE TABLE IF NOT EXISTS socios_cadastro (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  nome TEXT,
  cpf TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (empresa_id) REFERENCES empresas_cadastro(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_socios_cadastro_empresa_id ON socios_cadastro(empresa_id);
