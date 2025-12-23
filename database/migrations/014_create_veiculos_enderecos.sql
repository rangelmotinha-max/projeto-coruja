-- Tabela de endereços vinculados a veículos
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS veiculos_enderecos (
  id TEXT PRIMARY KEY,
  veiculo_id TEXT NOT NULL,
  uf TEXT,
  logradouro TEXT,
  bairro TEXT,
  cep TEXT,
  complemento TEXT,
  lat_long TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_veiculos_enderecos_veiculo ON veiculos_enderecos(veiculo_id);
