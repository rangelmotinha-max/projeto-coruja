-- Migração para persistir a idade calculada em registros de pessoas
ALTER TABLE pessoas ADD COLUMN idade INTEGER;
