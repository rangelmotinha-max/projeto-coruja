-- Cria tabela de veículos vinculados a pessoas com estrutura equivalente à tabela geral de veículos
CREATE TABLE IF NOT EXISTS veiculos_pessoas (
  id TEXT PRIMARY KEY,
  pessoa_id TEXT NOT NULL,
  nomeProprietario TEXT NOT NULL,
  cpf TEXT,
  placa TEXT NOT NULL,
  marcaModelo TEXT,
  cor TEXT,
  anoModelo INTEGER,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

-- Índices otimizando buscas por placa e CPF no contexto do cadastro de pessoas
CREATE INDEX IF NOT EXISTS idx_veiculos_pessoas_placa ON veiculos_pessoas(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_pessoas_cpf ON veiculos_pessoas(cpf);
CREATE INDEX IF NOT EXISTS idx_veiculos_pessoas_pessoa_id ON veiculos_pessoas(pessoa_id);
