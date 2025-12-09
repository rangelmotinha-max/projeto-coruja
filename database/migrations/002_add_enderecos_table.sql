-- Migração 002: Adicionar tabela de endereços e reorganizar tabela de pessoas
-- Esta migração é executada automaticamente pelo sqlite.js na inicialização

-- Criar tabela de endereços se não existir
CREATE TABLE IF NOT EXISTS enderecos (
  id TEXT PRIMARY KEY,
  pessoa_id TEXT NOT NULL,
  uf TEXT,
  logradouro TEXT,
  bairro TEXT,
  complemento TEXT,
  -- Coluna para armazenar latitude e longitude preenchidas pelo usuário
  lat_long TEXT,
  cep TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

-- Criar índice para queries eficientes
CREATE INDEX IF NOT EXISTS idx_enderecos_pessoa_id ON enderecos(pessoa_id);

