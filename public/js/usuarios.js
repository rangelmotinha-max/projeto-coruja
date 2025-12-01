(function () {
  // Constantes de armazenamento utilizadas em todo o fluxo de autenticação
  const TOKEN_KEY = 'authToken';
  const API_URL = '/usuarios';

  // Referências de elementos da interface
  const tabelaCorpo = document.getElementById('usuarios-tabela-corpo');
  const feedbackLista = document.getElementById('usuarios-feedback');
  const feedbackDetalhes = document.getElementById('detalhes-feedback');
  const botaoNovo = document.getElementById('novo-usuario');
  const formulario = document.getElementById('usuario-form');
  const botaoSubmit = document.getElementById('usuario-submit');

  const campoNome = document.getElementById('usuario-nome');
  const campoEmail = document.getElementById('usuario-email');
  const campoSenha = document.getElementById('usuario-senha');
  const campoRole = document.getElementById('usuario-role');

  const detalheNome = document.getElementById('detalhe-nome');
  const detalheEmail = document.getElementById('detalhe-email');
  const detalheRole = document.getElementById('detalhe-role');

  let usuarioEmEdicao = null;

  // Utilitário para obter cookies específicos
  const getCookie = (name) => {
    return document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.split('=')[1];
  };

  // Recupera o token salvo para autenticar as chamadas
  const getToken = () => localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);

  // Limpa qualquer vestígio de autenticação e redireciona para login
  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  };

  // Envelopa chamadas fetch adicionando o cabeçalho Authorization
  const authorizedFetch = (url, options = {}) => {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

  // Exibe feedbacks visuais e auditivos acessíveis
  const setMessage = (element, text, type = 'info') => {
    if (!element) return;

    element.textContent = text;
    element.className = 'message';

    if (text) {
      element.classList.add(`message--${type}`);
    }
  };

  // Atualiza painel de detalhes com dados selecionados
  const atualizarDetalhes = (usuario) => {
    if (!usuario) return;
    detalheNome.textContent = usuario.nome || '—';
    detalheEmail.textContent = usuario.email || '—';
    detalheRole.textContent = usuario.role || '—';
  };

  // Limpa o formulário para o estado inicial
  const resetarFormulario = () => {
    usuarioEmEdicao = null;
    formulario?.reset();
    botaoSubmit.textContent = 'Salvar usuário';
    setMessage(feedbackDetalhes, 'Pronto para cadastrar um novo usuário.', 'info');
  };

  // Monta ações para cada linha da tabela
  const criarCelulaAcoes = (usuario) => {
    const td = document.createElement('td');
    td.classList.add('table__actions');

    // Botão de consulta de dados
    const botaoConsultar = document.createElement('button');
    botaoConsultar.type = 'button';
    botaoConsultar.className = 'button button--ghost';
    botaoConsultar.textContent = 'Consultar';
    botaoConsultar.setAttribute('aria-label', `Consultar dados de ${usuario.nome || 'usuário'}`);
    botaoConsultar.addEventListener('click', () => {
      atualizarDetalhes(usuario);
      setMessage(feedbackDetalhes, 'Usuário destacado para consulta.', 'info');
    });

    // Botão de edição com confirmação
    const botaoEditar = document.createElement('button');
    botaoEditar.type = 'button';
    botaoEditar.className = 'button button--secondary';
    botaoEditar.textContent = 'Editar';
    botaoEditar.setAttribute('aria-label', `Editar dados de ${usuario.nome || 'usuário'}`);
    botaoEditar.addEventListener('click', () => {
      atualizarDetalhes(usuario);
      campoNome.value = usuario.nome || '';
      campoEmail.value = usuario.email || '';
      campoRole.value = usuario.role || '';
      campoSenha.value = '';
      usuarioEmEdicao = usuario.id;
      botaoSubmit.textContent = 'Atualizar usuário';
      setMessage(
        feedbackDetalhes,
        'Edição iniciada. Confirme o envio ao atualizar os dados.',
        'info'
      );
    });

    // Botão de exclusão com confirmação
    const botaoExcluir = document.createElement('button');
    botaoExcluir.type = 'button';
    botaoExcluir.className = 'button button--danger';
    botaoExcluir.textContent = 'Excluir';
    botaoExcluir.setAttribute('aria-label', `Excluir ${usuario.nome || 'usuário'}`);
    botaoExcluir.addEventListener('click', async () => {
      const confirmacao = confirm('Deseja realmente excluir este usuário?');
      if (!confirmacao) return;

      setMessage(feedbackDetalhes, 'Excluindo usuário selecionado...', 'info');

      try {
        const response = await authorizedFetch(`${API_URL}/${usuario.id}`, {
          method: 'DELETE',
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
          clearAuth();
          window.location.href = '/';
          return;
        }

        if (!response.ok) {
          const erro = data?.mensagem || data?.message || 'Falha ao excluir usuário.';
          throw new Error(erro);
        }

        setMessage(feedbackDetalhes, 'Usuário excluído com sucesso.', 'success');
        await carregarUsuarios();
        resetarFormulario();
      } catch (error) {
        setMessage(
          feedbackDetalhes,
          error?.message || 'Erro inesperado ao excluir o usuário.',
          'error'
        );
      }
    });

    td.append(botaoConsultar, botaoEditar, botaoExcluir);
    return td;
  };

  // Renderiza as linhas da tabela
  const renderizarUsuarios = (usuarios = []) => {
    if (!tabelaCorpo) return;
    tabelaCorpo.innerHTML = '';

    if (!usuarios.length) {
      const linha = document.createElement('tr');
      const celula = document.createElement('td');
      celula.colSpan = 4;
      celula.textContent = 'Nenhum usuário encontrado.';
      linha.appendChild(celula);
      tabelaCorpo.appendChild(linha);
      return;
    }

    usuarios.forEach((usuario) => {
      const linha = document.createElement('tr');

      const nome = document.createElement('td');
      nome.textContent = usuario.nome || '—';
      linha.appendChild(nome);

      const email = document.createElement('td');
      email.textContent = usuario.email || '—';
      linha.appendChild(email);

      const role = document.createElement('td');
      role.textContent = usuario.role || '—';
      linha.appendChild(role);

      linha.appendChild(criarCelulaAcoes(usuario));
      tabelaCorpo.appendChild(linha);
    });
  };

  // Busca lista de usuários na API
  const carregarUsuarios = async () => {
    setMessage(feedbackLista, 'Carregando usuários...', 'info');

    try {
      const response = await authorizedFetch(API_URL);
      const data = await response.json().catch(() => []);

      if (response.status === 401) {
        clearAuth();
        window.location.href = '/';
        return;
      }

      if (!response.ok) {
        const erro = data?.mensagem || data?.message || 'Não foi possível obter os usuários.';
        throw new Error(erro);
      }

      renderizarUsuarios(Array.isArray(data) ? data : []);
      setMessage(feedbackLista, 'Usuários carregados com sucesso.', 'success');
    } catch (error) {
      setMessage(
        feedbackLista,
        error?.message || 'Erro inesperado ao carregar usuários.',
        'error'
      );
    }
  };

  // Envia dados do formulário para criar ou atualizar
  const salvarUsuario = async (event) => {
    event.preventDefault();

    if (!formulario) return;

    const nome = campoNome.value.trim();
    const email = campoEmail.value.trim();
    const senha = campoSenha.value.trim();
    const role = campoRole.value;

    if (!nome || !email || !role) {
      setMessage(feedbackDetalhes, 'Preencha nome, e-mail e perfil para continuar.', 'error');
      return;
    }

    const metodo = usuarioEmEdicao ? 'PUT' : 'POST';
    const url = usuarioEmEdicao ? `${API_URL}/${usuarioEmEdicao}` : API_URL;

    if (usuarioEmEdicao) {
      const confirmacao = confirm('Confirmar atualização deste usuário?');
      if (!confirmacao) return;
    }

    botaoSubmit.disabled = true;
    botaoSubmit.textContent = usuarioEmEdicao ? 'Atualizando...' : 'Salvando...';
    setMessage(feedbackDetalhes, 'Enviando dados do usuário...', 'info');

    const payload = { nome, email, role };
    if (senha) payload.senha = senha;

    try {
      const response = await authorizedFetch(url, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAuth();
        window.location.href = '/';
        return;
      }

      if (!response.ok) {
        const erro = data?.mensagem || data?.message || 'Não foi possível salvar o usuário.';
        throw new Error(erro);
      }

      setMessage(feedbackDetalhes, 'Usuário salvo com sucesso.', 'success');
      atualizarDetalhes(data);
      resetarFormulario();
      await carregarUsuarios();
    } catch (error) {
      setMessage(
        feedbackDetalhes,
        error?.message || 'Erro inesperado ao salvar os dados.',
        'error'
      );
    } finally {
      botaoSubmit.disabled = false;
      botaoSubmit.textContent = usuarioEmEdicao ? 'Atualizar usuário' : 'Salvar usuário';
    }
  };

  // Inicializa interações somente na página de usuários
  const inicializarPagina = () => {
    if (!document.querySelector('[data-page="usuarios"]')) return;

    carregarUsuarios();
    resetarFormulario();

    formulario?.addEventListener('submit', salvarUsuario);
    formulario?.addEventListener('reset', () => {
      // Comentário: limpeza manual para garantir estados visuais consistentes
      resetarFormulario();
    });
    botaoNovo?.addEventListener('click', resetarFormulario);
  };

  inicializarPagina();
})();
