-- Migração 001: tabelas iniciais de usuários, pessoas e contatos
PRAGMA foreign_keys=ON;

-- Usuários autenticados da aplicação
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senhaHash TEXT NOT NULL,
  role TEXT NOT NULL,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL
);

-- Cadastro base de pessoas
CREATE TABLE IF NOT EXISTS pessoas (
  id TEXT PRIMARY KEY,
  nomeCompleto TEXT NOT NULL,
  apelido TEXT,
  dataNascimento TEXT,
  cpf TEXT,
  rg TEXT,
  cnh TEXT,
  nomeMae TEXT,
  nomePai TEXT,
  telefone TEXT,
  endereco_atual_index INTEGER DEFAULT 0,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL
);

-- Telefones adicionais vinculados à pessoa
CREATE TABLE IF NOT EXISTS telefones (
  id TEXT PRIMARY KEY,
  pessoa_id TEXT NOT NULL,
  numero TEXT NOT NULL,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_telefones_pessoa_id ON telefones(pessoa_id);

-- Emails adicionais vinculados à pessoa
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  pessoa_id TEXT NOT NULL,
  email TEXT NOT NULL,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_emails_pessoa_id ON emails(pessoa_id);

-- Perfis em redes sociais
CREATE TABLE IF NOT EXISTS redes_sociais (
  id TEXT PRIMARY KEY,
  pessoa_id TEXT NOT NULL,
  perfil TEXT NOT NULL,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_redes_pessoa_id ON redes_sociais(pessoa_id);

-- Empresas vinculadas diretamente ao cadastro de pessoa
CREATE TABLE IF NOT EXISTS empresas (
  id TEXT PRIMARY KEY,
  pessoa_id TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  razaoSocial TEXT,
  nomeFantasia TEXT,
  naturezaJuridica TEXT,
  dataInicioAtividade TEXT,
  situacaoCadastral TEXT,
  cep TEXT,
  endereco TEXT,
  telefone TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

-- Sócios da empresa vinculada à pessoa
CREATE TABLE IF NOT EXISTS socios (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  nome TEXT,
  cpf TEXT,
  criadoEm TEXT NOT NULL,
  atualizadoEm TEXT NOT NULL,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_socios_empresa_id ON socios(empresa_id);
