# agent.md

## Descrição do Projeto

O Projeto Coruja é uma aplicação web para administração de usuários, perfis e cadastros de pessoas e empresas. O sistema utiliza Node.js no backend, banco de dados SQLite, e uma interface moderna em HTML, CSS e JavaScript. O objetivo é facilitar o gerenciamento de usuários, incluindo cadastro, edição, visualização e autenticação, com foco em acessibilidade e usabilidade.

## Estrutura de Pastas

- `server.js`: Servidor principal Node.js.
- `config/`: Configurações de banco de dados e ambiente.
- `database/`: Migrações e seeds para o banco SQLite.
- `public/`: Arquivos estáticos (HTML, CSS, JS) e páginas do frontend.
- `scripts/`: Scripts utilitários para inicialização e seed do banco.
- `src/`: Código-fonte do backend (controllers, models, routes, services, middlewares, utils).
- `views/`: Layouts e partials HTML para renderização de páginas.

## Principais Funcionalidades

- **Autenticação e Autorização**: Controle de acesso por perfil (admin, editor, viewer).
- **Cadastro de Usuários**: Formulário modal para adicionar/editar usuários, validação de campos obrigatórios.
- **Listagem Dinâmica**: Tabela de usuários carregada via API (`/api/usuarios`), com feedback de status.
- **Gestão de Perfis**: Perfis diferenciados para administração, edição e visualização.
- **Cadastro de Pessoas e Empresas**: Páginas dedicadas para cada tipo de cadastro.
- **Tema Claro/Escuro**: Alternância de tema acessível via botão na sidebar.
- **Acessibilidade**: Navegação por teclado, feedback ARIA, modal acessível.

## Fluxo de Usuário

1. Login/autenticação.
2. Navegação pelo menu lateral para acessar páginas de usuários, perfil, cadastros.
3. Visualização da lista de usuários e ações de recarregar/adicionar.
4. Cadastro/edição de usuários via modal, com validação e feedback.
5. Logout pelo botão na sidebar.

## APIs e Integrações

- **API REST**: Endpoints para CRUD de usuários, pessoas e empresas.
- **Banco de Dados**: SQLite, com migrações e seeds para inicialização.
- **Frontend Dinâmico**: JS para manipulação de DOM, requisições AJAX, controle de modais e feedbacks.

## Observações Técnicas

- O projeto segue boas práticas de separação de responsabilidades (MVC).
- Utiliza middlewares para autenticação e tratamento de erros.
- Scripts para inicialização e popular o banco de dados.
- Interface responsiva e acessível.

## Como Executar

1. Instale as dependências: `npm install`
2. Inicialize o banco: `node scripts/init-db.js`
3. Popule com usuários base: `node scripts/seed-admin.js`
4. Inicie o servidor: `npm start`
5. Acesse via navegador: `http://localhost:3000`

## Autor

Rangel Motinha

---
Este documento resume a arquitetura, funcionalidades e fluxo do Projeto Coruja para referência de agentes e colaboradores.