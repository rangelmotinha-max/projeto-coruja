-- Adiciona vínculo opcional com a rede social na tabela de imagens
ALTER TABLE pessoas_redes_imagens ADD COLUMN rede_social_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pessoas_redes_imagens_rede_social ON pessoas_redes_imagens(rede_social_id);
