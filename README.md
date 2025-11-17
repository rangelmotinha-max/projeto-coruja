# Projeto Coruja

## Banco de dados local

- O projeto agora usa SQLite no arquivo `database/database.sqlite`.
- Para preparar o banco (criar o arquivo e a tabela `usuarios`), execute:

```bash
npm run db:init
```

O script aplica automaticamente a migration básica (`usuarios` com colunas `id`, `nome`, `email`, `senhaHash`, `role`, `criadoEm`, `atualizadoEm`).

## Executando a aplicação

```bash
npm install
npm run db:init
npm start
```

A aplicação inicializa a conexão SQLite automaticamente ao utilizar os modelos.
