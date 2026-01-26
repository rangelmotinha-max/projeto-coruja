-- Veículos vinculados a empresas
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS veiculos_empresas (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  nomeProprietario TEXT NOT NULL,
  cnpj TEXT,
  placa TEXT NOT NULL,
  marcaModelo TEXT,
  cor TEXT,
  anoModelo INTEGER,
  obs TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (empresa_id) REFERENCES empresas_cadastro(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_veiculos_empresas_placa ON veiculos_empresas(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_empresas_cnpj ON veiculos_empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_veiculos_empresas_empresa_id ON veiculos_empresas(empresa_id);
