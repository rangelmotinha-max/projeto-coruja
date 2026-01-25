-- Criar tabela de fotos por empresa com metadados básicos
CREATE TABLE IF NOT EXISTS fotos_empresas (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  nome_arquivo TEXT,
  caminho TEXT NOT NULL,
  mime_type TEXT,
  tamanho INTEGER,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (empresa_id) REFERENCES empresas_cadastro(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fotos_empresa_id ON fotos_empresas(empresa_id);
