-- Migração para incluir a coluna "sinais" em pessoas, permitindo registrar características físicas
ALTER TABLE pessoas ADD COLUMN sinais TEXT;
