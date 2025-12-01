(function () {
  // Constantes de armazenamento utilizadas em todo o fluxo de autenticação
  const TOKEN_KEY = 'authToken';
  // Comentário: novo prefixo dedicado à API de usuários
  const API_URL = '/api/usuarios';

  // Referências simplificadas da interface
  const tabelaCorpo = document.getElementById('usuarios-lista');
  const botaoRecarregar = document.getElementById('recarregar-usuarios');
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

  let alertContainer = document.getElementById('alert-container');

  // Cria e exibe alertas globais com foco em acessibilidade
  const setMessage = (contexto = 'Aviso', texto, tipo = 'info') => {
    if (!texto) return;

    const container =
      alertContainer ||
      (() => {
        const fallback = document.createElement('div');
        fallback.id = 'alert-container';
        fallback.className = 'alert-container';
        fallback.setAttribute('role', 'status');
        fallback.setAttribute('aria-live', 'polite');
        fallback.setAttribute('aria-atomic', 'true');
        document.body.appendChild(fallback);
        alertContainer = fallback;
        return fallback;
      })();

    const alerta = document.createElement('div');
    alerta.className = `alert alert--${tipo}`;
    alerta.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    alerta.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
    alerta.setAttribute('tabindex', '0');

    // Conteúdo do alerta com título do contexto e mensagem detalhada
    const conteudo = document.createElement('div');
    conteudo.className = 'alert__content';

    const titulo = document.createElement('strong');
    titulo.className = 'alert__title';
    titulo.textContent = contexto;

    const mensagem = document.createElement('span');
    mensagem.className = 'alert__message';
    mensagem.textContent = texto;

    conteudo.append(titulo, mensagem);

    // Botão de fechar para controle manual do usuário
    const fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.className = 'alert__close';
    fechar.setAttribute('aria-label', 'Fechar alerta');
    fechar.innerHTML = '×';
    fechar.addEventListener('click', () => alerta.remove());

    alerta.append(conteudo, fechar);
    container.appendChild(alerta);

    // Remoção automática após alguns segundos com comentário explicativo
    setTimeout(() => alerta.remove(), 8000);

    // Foco para leitura imediata por tecnologias assistivas
    alerta.focus({ preventScroll: true });
  };

  // Limpa o formulário para o estado inicial
  const resetarFormulario = () => {
    usuarioEmEdicao = null;
    formulario?.reset();
    botaoSubmit.textContent = 'Salvar usuário';
    setMessage(
      'Formulário de usuário',
      'Preencha os campos para incluir um novo usuário ou editar um existente.',
      'info'
    );
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
      setMessage('Formulário de usuário', 'Edição iniciada. Salve para confirmar a atualização.', 'info');
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

      setMessage('Lista de usuários', 'Excluindo usuário selecionado...', 'info');

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

        setMessage('Lista de usuários', 'Usuário excluído com sucesso.', 'success');
        await carregarUsuarios();
        resetarFormulario();
      } catch (error) {
        setMessage(
          'Lista de usuários',
          error?.message || 'Erro inesperado ao excluir o usuário.',
          'error'
        );
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
    setMessage('Lista de usuários', 'Carregando usuários...', 'info');

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

      setMessage(
        'Lista de usuários',
        listaUsuarios.length ? 'Usuários carregados com sucesso.' : 'Nenhum usuário cadastrado encontrado.',
        listaUsuarios.length ? 'success' : 'info'
      );
    } catch (error) {
      setMessage(
        'Lista de usuários',
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
      setMessage('Formulário de usuário', 'Preencha nome, e-mail e perfil para continuar.', 'error');
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
    setMessage('Formulário de usuário', 'Enviando dados do usuário...', 'info');

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

      setMessage('Formulário de usuário', 'Usuário salvo com sucesso.', 'success');
      // Notifica listeners (ex.: script que fecha o modal)
      try {
        document.dispatchEvent(new Event('usuario:salvo'));
      } catch (e) {}
      resetarFormulario();
      await carregarUsuarios();
    } catch (error) {
      setMessage(
        'Formulário de usuário',
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
    botaoRecarregar?.addEventListener('click', carregarUsuarios);
  };

  inicializarPagina();
})();
