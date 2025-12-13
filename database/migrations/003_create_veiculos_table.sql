-- Create veiculos table
CREATE TABLE IF NOT EXISTS veiculos (
  id TEXT PRIMARY KEY,
  pessoa_id TEXT NULL,
  proprietario TEXT,
  cpfProprietario TEXT,
  marcaModelo TEXT,
  placa TEXT UNIQUE,
  cor TEXT,
  anoModelo TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE SET NULL
);