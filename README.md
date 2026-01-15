# Projeto Coruja

## Banco de dados local

- O projeto agora usa SQLite no arquivo `database/database.sqlite`.
- Para preparar o banco (criar o arquivo e aplicar todas as migrations em ordem), execute:

```bash
npm run db:init
```

O script aplica automaticamente todas as migrations numeradas em `database/migrations` usando a tabela interna `_migrations` para controle de versão. Cada arquivo `.sql` é executado uma única vez, em ordem crescente, com logs indicando sucesso ou falha.

### Fluxo de criação e rollback

1. Criação inicial: rode `npm run db:init` para gerar o arquivo `database.sqlite` e aplicar as migrations pendentes. O processo registra cada passo em `_migrations`.
2. Rollback seguro: faça backup do arquivo `database/database.sqlite` antes de alterar migrações. Para retornar ao estado anterior, restaure o backup e, se necessário, remova a linha correspondente no `_migrations` (via CLI do SQLite) para permitir reaplicação.
3. Recriar do zero: em ambientes locais, você pode apagar o arquivo do banco (`rm database/database.sqlite`) e executar novamente `npm run db:init` para reconstruir toda a estrutura a partir das migrations.

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

### Normalização de telefones

- A coluna legado `pessoas.telefone` foi removida do schema. A fonte oficial é a tabela `telefones`, associada por `pessoa_id`.
- Para migrar dados existentes e remover duplicidades, execute:

```bash
npm run db:migrar-telefones
```

O comando aplica limpeza de números repetidos e insere os valores antigos na tabela normalizada sem quebrar chaves estrangeiras.

## Executando a aplicação

```bash
npm install
npm run db:init
npm start
```

A aplicação inicializa a conexão SQLite automaticamente ao utilizar os modelos.

## Configuração do Google Maps (Geocoding)

- Defina a chave da API do Google Maps na variável de ambiente `GOOGLE_MAPS_API_KEY`.
- O backend injeta essa chave no frontend via `/js/maps-config.js`, consumido em `public/rede.html`.

Opção A: arquivo `.env` (recomendado)

1. Copie o arquivo `.env.example` para `.env` na raiz do projeto.
2. Preencha `GOOGLE_MAPS_API_KEY` com sua chave do Google Cloud.
3. Reinicie o servidor (`npm start`).

Opção B: variável de ambiente temporária

Exemplo (Linux/macOS):

```bash
# Comentário: substitua pelo valor fornecido no Google Cloud Console
export GOOGLE_MAPS_API_KEY="sua-chave-aqui"
```

Exemplo (Windows PowerShell):

```powershell
$env:GOOGLE_MAPS_API_KEY = "sua-chave-aqui"
npm start
```

Observação: se o mapa exibir a mensagem "Informe a chave do Google Maps na variável GOOGLE_MAPS_API_KEY", verifique se a chave está presente no `.env` ou no ambiente antes de iniciar o servidor. O endpoint `/js/maps-config.js` deve retornar `window.APP_CONFIG.googleMapsApiKey` com um valor não vazio.
