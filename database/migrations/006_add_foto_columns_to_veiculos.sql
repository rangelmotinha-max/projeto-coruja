-- Migração 006: adicionar colunas de foto na tabela de veículos
PRAGMA foreign_keys=OFF;

-- Adiciona as colunas necessárias para armazenar metadados de fotos
ALTER TABLE veiculos ADD COLUMN foto_caminho TEXT;
ALTER TABLE veiculos ADD COLUMN foto_nome TEXT;
ALTER TABLE veiculos ADD COLUMN foto_mime TEXT;

PRAGMA foreign_keys=ON;
