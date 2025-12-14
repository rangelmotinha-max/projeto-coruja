-- Add JSON columns to store complex Vinculos and Ocorrencias structures
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

ALTER TABLE pessoas ADD COLUMN vinculos_json TEXT;
ALTER TABLE pessoas ADD COLUMN ocorrencias_json TEXT;

COMMIT;
PRAGMA foreign_keys=ON;
