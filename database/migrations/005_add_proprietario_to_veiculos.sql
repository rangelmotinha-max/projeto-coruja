-- Migração 005: adicionar coluna obrigatória de proprietário na tabela de veículos
PRAGMA foreign_keys=OFF;

-- Adiciona a coluna com default temporário para garantir compatibilidade
ALTER TABLE veiculos ADD COLUMN proprietario TEXT NOT NULL DEFAULT '';

-- Recria a tabela para remover o default e manter a coluna obrigatória
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
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL
);

-- Copia os dados existentes garantindo preenchimento da nova coluna
INSERT INTO veiculos_novo (
  id, proprietario, cpf, marcaModelo, placa, cor, anoModelo,
  foto_caminho, foto_nome, foto_mime, criadoEm, atualizadoEm
)
SELECT
  id,
  COALESCE(proprietario, ''),
  cpf,
  marcaModelo,
  placa,
  cor,
  anoModelo,
  foto_caminho,
  foto_nome,
  foto_mime,
  criadoEm,
  atualizadoEm
FROM veiculos;

DROP TABLE veiculos;
ALTER TABLE veiculos_novo RENAME TO veiculos;

-- Recria índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_veiculos_cpf ON veiculos(cpf);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);

PRAGMA foreign_keys=ON;
