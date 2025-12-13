-- Migração 006: remove a obrigatoriedade de pessoa_id da tabela de veículos
PRAGMA foreign_keys=OFF;

-- Recria a tabela alinhando a estrutura usada pela aplicação
CREATE TABLE veiculos_corrigido (
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

-- Copia os dados existentes descartando a coluna pessoa_id quando presente
INSERT INTO veiculos_corrigido (
  id, proprietario, cpf, marcaModelo, placa, cor, anoModelo,
  foto_caminho, foto_nome, foto_mime, criadoEm, atualizadoEm
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
  criadoEm,
  atualizadoEm
FROM veiculos;

DROP TABLE veiculos;
ALTER TABLE veiculos_corrigido RENAME TO veiculos;

-- Recria índices após a troca de tabela
CREATE INDEX IF NOT EXISTS idx_veiculos_cpf ON veiculos(cpf);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);

PRAGMA foreign_keys=ON;
