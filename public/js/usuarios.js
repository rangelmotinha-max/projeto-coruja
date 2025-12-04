(function () {
  // Constantes de armazenamento utilizadas em todo o fluxo de autenticação
  const TOKEN_KEY = 'authToken';
  // Comentário: novo prefixo dedicado à API de usuários
  const API_URL = '/api/usuarios';

  // Referências simplificadas da interface
  const tabelaCorpo = document.getElementById('usuarios-lista');
  const formulario = document.getElementById('usuario-form');
  const botaoSubmit = document.getElementById('usuario-submit');

  const campoNome = document.getElementById('usuario-nome');
  const campoEmail = document.getElementById('usuario-email');
  const campoSenha = document.getElementById('usuario-senha');
  const campoRole = document.getElementById('usuario-role');

  // Elementos de paginação
  const registrosPorPaginaInput = document.getElementById('registros-por-pagina');
  const paginaAnteriorBtn = document.getElementById('pagina-anterior');
  const proximaPaginaBtn = document.getElementById('proxima-pagina');
  const infoPaginacaoEl = document.getElementById('info-paginacao');

  // Campo de busca
  const campoConsulta = document.getElementById('campo-consulta');
  const alertContainer = document.getElementById('alert-container');

  // Estado da paginação
  let todosUsuarios = [];
  let usuariosFiltrados = [];
  let paginaAtual = 1;
  let registrosPorPagina = 10;
  let termoBusca = '';

  let usuarioEmEdicao = null;
  let ultimaAcaoFoiEdicao = false;

  const setMessage = (text, type = 'info') => {
    if (!alertContainer) return;
    alertContainer.textContent = text || '';
    alertContainer.className = 'message';
    if (text) alertContainer.classList.add(`message--${type}`);
  };

  // Modal (se presente na página)
  const modalEl = document.getElementById('usuario-modal');
  const openModal = () => {
    if (!modalEl) return;
    modalEl.setAttribute('aria-hidden', 'false');
  };
  const closeModal = () => {
    if (!modalEl) return;
    modalEl.setAttribute('aria-hidden', 'true');
  };

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

  // Limpa o formulário para o estado inicial
  const resetarFormulario = () => {
    usuarioEmEdicao = null;
    formulario?.reset();
    botaoSubmit.textContent = 'Incluir';
  };

  // Monta ações para cada linha da tabela
  const criarCelulaAcoes = (usuario) => {
    const td = document.createElement('td');
    td.classList.add('table__actions');

    // Botão de edição que preenche o formulário
    const botaoEditar = document.createElement('button');
    botaoEditar.type = 'button';
    botaoEditar.className = 'button button--secondary';
    botaoEditar.textContent = 'Editar';
    botaoEditar.setAttribute('aria-label', `Editar dados de ${usuario.nome || 'usuário'}`);
    botaoEditar.addEventListener('click', () => {
      campoNome.value = usuario.nome || '';
      campoEmail.value = usuario.email || '';
      campoRole.value = usuario.role || '';
      campoSenha.value = '';
      usuarioEmEdicao = usuario.id;
      botaoSubmit.textContent = 'Salvar';
      // Abre o modal quando for edição, se houver modal na página
      openModal();
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

        await carregarUsuarios();
        resetarFormulario();
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
      }
    });

    td.append(botaoEditar, botaoExcluir);
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

  // Calcula o intervalo de usuários para a página atual
  const obterPaginaUsuarios = () => {
    const inicio = (paginaAtual - 1) * registrosPorPagina;
    const fim = inicio + registrosPorPagina;
    return usuariosFiltrados.slice(inicio, fim);
  };

  // Filtra usuários por termo de busca
  const filtrarUsuarios = (termo) => {
    termoBusca = termo.toLowerCase().trim();

    if (!termoBusca) {
      usuariosFiltrados = [...todosUsuarios];
    } else {
      usuariosFiltrados = todosUsuarios.filter((usuario) => {
        const nome = (usuario.nome || '').toLowerCase();
        const email = (usuario.email || '').toLowerCase();
        const role = (usuario.role || '').toLowerCase();

        return nome.includes(termoBusca) || email.includes(termoBusca) || role.includes(termoBusca);
      });
    }

    paginaAtual = 1;
    renderizarPaginaAtual();
  };

  // Atualiza os controles de paginação
  const atualizarControlesPaginacao = () => {
    const totalPaginas = Math.ceil(usuariosFiltrados.length / registrosPorPagina);
    const usuariosPagina = obterPaginaUsuarios();

    infoPaginacaoEl.textContent = `Página ${paginaAtual} de ${totalPaginas || 1} (${usuariosPagina.length} de ${usuariosFiltrados.length} registros)`;
    paginaAnteriorBtn.disabled = paginaAtual === 1;
    proximaPaginaBtn.disabled = paginaAtual >= totalPaginas;
  };

  // Renderiza a página atual
  const renderizarPaginaAtual = () => {
    const usuariosPagina = obterPaginaUsuarios();
    renderizarUsuarios(usuariosPagina);
    atualizarControlesPaginacao();
  };

  // Navega para próxima página
  const irProximaPagina = () => {
    const totalPaginas = Math.ceil(usuariosFiltrados.length / registrosPorPagina);
    if (paginaAtual < totalPaginas) {
      paginaAtual++;
      renderizarPaginaAtual();
    }
  };

  // Navega para página anterior
  const irPaginaAnterior = () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      renderizarPaginaAtual();
    }
  };

  // Muda o limite de registros por página
  const mudarRegistrosPorPagina = (novoLimite) => {
    const limite = Math.max(1, Math.min(100, parseInt(novoLimite) || 10));
    registrosPorPagina = limite;
    registrosPorPaginaInput.value = limite;
    paginaAtual = 1;
    renderizarPaginaAtual();
  };

  // Comentário: busca usuários sem filtros para manter a experiência direta
  const carregarUsuarios = async () => {
    try {
      const url = new URL(API_URL, window.location.origin);

      const response = await authorizedFetch(url.toString());
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

      todosUsuarios = Array.isArray(data) ? data : [];
      usuariosFiltrados = [...todosUsuarios];
      campoConsulta.value = '';
      termoBusca = '';
      paginaAtual = 1;
      renderizarPaginaAtual();
      if (ultimaAcaoFoiEdicao) {
        setMessage('Alteração realizada com sucesso!', 'success');
        ultimaAcaoFoiEdicao = false;
      } else {
        setMessage('Lista atualizada.', 'success');
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setMessage('Não foi possível carregar a lista.', 'error');
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
      return;
    }

    const metodo = usuarioEmEdicao ? 'PUT' : 'POST';
    const url = usuarioEmEdicao ? `${API_URL}/${usuarioEmEdicao}` : API_URL;

    if (usuarioEmEdicao) {
      const confirmacao = confirm('Confirmar atualização deste usuário?');
      if (!confirmacao) return;
    }

    botaoSubmit.disabled = true;
    botaoSubmit.textContent = 'Salvando...';

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

      // Notifica listeners (ex.: script que fecha o modal)
      try {
        document.dispatchEvent(new Event('usuario:salvo'));
      } catch (e) {}
      setMessage(usuarioEmEdicao ? 'Alteração realizada com sucesso!' : 'Registro incluído com sucesso!', 'success');
      ultimaAcaoFoiEdicao = Boolean(usuarioEmEdicao);
      resetarFormulario();
      await carregarUsuarios();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setMessage(error?.message || 'Não foi possível salvar o usuário.', 'error');
    } finally {
      botaoSubmit.disabled = false;
      botaoSubmit.textContent = usuarioEmEdicao ? 'Salvar' : 'Incluir';
    }
  };

  // Inicializa interações somente na página de usuários
  const inicializarPagina = () => {
    if (!document.querySelector('[data-page="usuarios"]')) return;

    carregarUsuarios();
    resetarFormulario();

    formulario?.addEventListener('submit', salvarUsuario);

    // Event listeners de paginação
    proximaPaginaBtn?.addEventListener('click', irProximaPagina);
    paginaAnteriorBtn?.addEventListener('click', irPaginaAnterior);
    registrosPorPaginaInput?.addEventListener('change', (e) => mudarRegistrosPorPagina(e.target.value));
    registrosPorPaginaInput?.addEventListener('input', (e) => mudarRegistrosPorPagina(e.target.value));

    // Event listener de busca
    campoConsulta?.addEventListener('input', (e) => filtrarUsuarios(e.target.value));
  };

  inicializarPagina();
})();
