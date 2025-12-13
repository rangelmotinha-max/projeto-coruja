-- Add JSON columns to store complex Vinculos and Ocorrencias structures
PRAGMA foreign_keys=OFF;

-- Add columns if they do not already exist (SQLite lacks IF NOT EXISTS for ALTER TABLE ADD COLUMN)
-- These statements will succeed if the columns are absent; if present, migration tooling should skip reapplying.
ALTER TABLE pessoas ADD COLUMN vinculos_json TEXT;
ALTER TABLE pessoas ADD COLUMN ocorrencias_json TEXT;

PRAGMA foreign_keys=ON;
