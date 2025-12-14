-- Cria tabela de veículos com campos básicos
CREATE TABLE IF NOT EXISTS veiculos (
  id TEXT PRIMARY KEY,
  nomeProprietario TEXT NOT NULL,
  cpf TEXT,
  placa TEXT NOT NULL,
  marcaModelo TEXT,
  cor TEXT,
  anoModelo INTEGER,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_cpf ON veiculos(cpf);
