-- Migração 007: tornar pessoa_id opcional na tabela veiculos
PRAGMA foreign_keys=OFF;

-- Recria a tabela veiculos permitindo pessoa_id nulo
CREATE TABLE veiculos_novo (
  id TEXT PRIMARY KEY,
  proprietario TEXT NOT NULL,
  cpf TEXT NOT NULL,
  marcaModelo TEXT,
  placa TEXT,
  cor TEXT,
  anoModelo TEXT,
  foto_caminho TEXT,
  foto_nome TEXT,
  foto_mime TEXT,
  pessoa_id TEXT, -- agora opcional
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL
);

-- Copia dados existentes. Se tabela antiga não tiver pessoa_id, usa NULL.
INSERT INTO veiculos_novo (
  id, proprietario, cpf, marcaModelo, placa, cor, anoModelo,
  foto_caminho, foto_nome, foto_mime, pessoa_id, criadoEm, atualizadoEm
)
SELECT
  id,
  proprietario,
  cpf,
  marcaModelo,
  placa,
  cor,
  anoModelo,
  foto_caminho,
  foto_nome,
  foto_mime,
  (
    SELECT CASE WHEN EXISTS(
      SELECT 1 FROM pragma_table_info('veiculos') WHERE name = 'pessoa_id'
    ) THEN pessoa_id ELSE NULL END
  ),
  criadoEm,
  atualizadoEm
FROM veiculos;

DROP TABLE veiculos;
ALTER TABLE veiculos_novo RENAME TO veiculos;

-- Recria índices
CREATE INDEX IF NOT EXISTS idx_veiculos_cpf ON veiculos(cpf);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);

PRAGMA foreign_keys=ON;
