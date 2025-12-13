-- Migração 008: remover a tabela de veículos e índices associados
BEGIN TRANSACTION;
PRAGMA foreign_keys = OFF;

-- Remove índices relacionados
DROP INDEX IF EXISTS idx_veiculos_cpf;
DROP INDEX IF EXISTS idx_veiculos_placa;

-- Remove tabela de veículos
DROP TABLE IF EXISTS veiculos;

PRAGMA foreign_keys = ON;
COMMIT;
