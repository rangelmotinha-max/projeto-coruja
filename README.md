# Projeto Coruja

## Banco de dados local

- O projeto agora usa SQLite no arquivo `database/database.sqlite`.
- Para preparar o banco (criar o arquivo e a tabela `usuarios`), execute:

```bash
npm run db:init
```

O script aplica automaticamente a migration básica (`usuarios` com colunas `id`, `nome`, `email`, `senhaHash`, `role`, `criadoEm`, `atualizadoEm`).

### Seed de administrador

- A criação do banco também tenta criar um usuário administrador padrão (role `admin`).
- Caso ainda não exista nenhum usuário com `role = 'admin'`, será criado automaticamente com:
  - Nome: `Administrador Coruja`
  - Email: `admin@coruja.local`
  - Senha padrão: `coruja-admin-123` (armazenada como hash via bcrypt)

Você pode reaplicar apenas o seed (sem recriar o banco) com:

```bash
npm run db:seed
```

O seed é idempotente: se já houver um administrador, nada é alterado. O valor padrão de `role` para novos usuários continua sendo `user`.

## Executando a aplicação

```bash
npm install
npm run db:init
npm start
```

A aplicação inicializa a conexão SQLite automaticamente ao utilizar os modelos.
