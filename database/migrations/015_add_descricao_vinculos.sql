-- Migração 015: adiciona campo de descrição aos vínculos diretos de pessoas
PRAGMA foreign_keys=ON;
BEGIN TRANSACTION;

-- Campo livre para registrar observações sobre o vínculo entre pessoas
ALTER TABLE vinculos_pessoas ADD COLUMN descricao TEXT;

COMMIT;
