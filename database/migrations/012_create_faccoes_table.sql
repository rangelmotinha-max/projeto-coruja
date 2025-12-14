-- Cria tabela dedicada para facções/organizações criminosas com identificação opcional
CREATE TABLE IF NOT EXISTS faccoes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  sigla TEXT,
  descricao TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL
);

-- Adiciona vínculo opcional de pessoa para facção existente
ALTER TABLE pessoas ADD COLUMN faccao_id TEXT REFERENCES faccoes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pessoas_faccao ON pessoas(faccao_id);

-- Popula facções base solicitadas (usa RANDOMBLOB para gerar UUIDs determinísticos o bastante para SQLite)
INSERT OR IGNORE INTO faccoes (id, nome, sigla, descricao, criadoEm, atualizadoEm) VALUES
  (LOWER(HEX(RANDOMBLOB(16))), 'Primeiro Comando da Capital', 'PCC', 'PCC (Primeiro Comando da Capital)', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Comando Vermelho', 'CV', 'CV (Comando Vermelho)', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Amigos dos Amigos', 'ADA', 'ADA (Amigos dos Amigos)', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Terceiro Comando Puro', 'TCP', 'TCP (Terceiro Comando Puro)', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Família do Norte', 'FDN', 'FDN (Família do Norte)', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Guardiões do Estado', 'GDE', 'GDE (Guardiões do Estado)', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Bonde dos 40', NULL, 'Bonde dos 40', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'PCM', 'PCM', 'PCM', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Bonde dos 13', NULL, 'Bonde dos 13', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Bonde dos 30', NULL, 'Bonde dos 30', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Comando Classe A', NULL, 'Comando Classe A', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'União do Norte', NULL, 'União do Norte', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Quadrilha do Perna', NULL, 'Quadrilha do Perna', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Comando da Paz', NULL, 'Comando da Paz', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Bonde dos Malucos', 'BDM', 'Bonde dos Malucos (BDM)', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Mercado do Povo Atitude', NULL, 'Mercado do Povo Atitude', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Catiara', NULL, 'Catiara', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Família Monstro', NULL, 'Família Monstro', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Trem Bala', NULL, 'Trem Bala', datetime('now'), datetime('now')),
  (LOWER(HEX(RANDOMBLOB(16))), 'Primeiro Comando de Vitória', 'PCV', 'Primeiro Comando de Vitória (PCV)', datetime('now'), datetime('now'));
