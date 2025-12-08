-- Create veiculos table
CREATE TABLE IF NOT EXISTS veiculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proprietario TEXT NOT NULL,
  cpfProprietario TEXT NOT NULL,
  marcaModelo TEXT NOT NULL,
  placa TEXT NOT NULL UNIQUE,
  cor TEXT,
  anoModelo TEXT,
  criadoEm DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizadoEm DATETIME
);