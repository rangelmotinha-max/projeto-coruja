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

  let usuarioEmEdicao = null;

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
    botaoSubmit.textContent = 'Salvar usuário';
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
      botaoSubmit.textContent = 'Atualizar usuário';
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

      const listaUsuarios = Array.isArray(data) ? data : [];
      renderizarUsuarios(listaUsuarios);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
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
    botaoSubmit.textContent = usuarioEmEdicao ? 'Atualizando...' : 'Salvando...';

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
      resetarFormulario();
      await carregarUsuarios();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
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
  };

  inicializarPagina();
})();
