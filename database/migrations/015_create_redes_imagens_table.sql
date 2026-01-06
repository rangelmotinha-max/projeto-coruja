-- Cria tabela para imagens de redes sociais vinculadas à pessoa (QR-CODE único e PERFIL múltiplas)
CREATE TABLE IF NOT EXISTS pessoas_redes_imagens (
  id TEXT PRIMARY KEY,
  pessoa_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('qr','perfil')),
  nome_arquivo TEXT,
  caminho TEXT NOT NULL,
  mime_type TEXT,
  tamanho INTEGER,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pessoas_redes_imagens_pessoa ON pessoas_redes_imagens(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pessoas_redes_imagens_tipo ON pessoas_redes_imagens(tipo);
