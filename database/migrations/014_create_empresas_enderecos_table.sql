-- Create table for company addresses
CREATE TABLE IF NOT EXISTS empresas_enderecos (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  uf TEXT,
  logradouro TEXT,
  bairro TEXT,
  cep TEXT,
  complemento TEXT,
  lat_long TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (empresa_id) REFERENCES empresas_cadastro(id) ON DELETE CASCADE
);

-- Index to speed up lookups
CREATE INDEX IF NOT EXISTS idx_empresas_enderecos_empresa ON empresas_enderecos(empresa_id);
