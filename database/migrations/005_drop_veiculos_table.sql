-- Remove tabela e índices de veículos para limpar dados legados
PRAGMA foreign_keys = ON; -- Garante aplicação de chaves estrangeiras durante a queda

-- Elimina índice manual caso exista antes de remover a tabela
DROP INDEX IF EXISTS idx_veiculos_pessoa_id;

-- Remove a tabela de veículos, cascatas serão aplicadas conforme restrições
DROP TABLE IF EXISTS veiculos;
