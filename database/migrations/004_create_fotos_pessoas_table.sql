-- Criar tabela de fotos por pessoa com metadados básicos
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
);

CREATE INDEX IF NOT EXISTS idx_fotos_pessoa_id ON fotos_pessoas(pessoa_id);
