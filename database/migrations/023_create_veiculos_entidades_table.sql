-- Veículos vinculados a entidades
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS veiculos_entidades (
  id TEXT PRIMARY KEY,
  entidade_id TEXT NOT NULL,
  nomeProprietario TEXT NOT NULL,
  cnpj TEXT,
  placa TEXT NOT NULL,
  marcaModelo TEXT,
  cor TEXT,
  anoModelo INTEGER,
  obs TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (entidade_id) REFERENCES entidades(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_veiculos_entidades_placa ON veiculos_entidades(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_entidades_cnpj ON veiculos_entidades(cnpj);
CREATE INDEX IF NOT EXISTS idx_veiculos_entidades_entidade_id ON veiculos_entidades(entidade_id);
