(function () {
  const TOKEN_KEY = 'authToken';
  const USER_KEY = 'authUser';
  // Comentário: prefixo dedicado para a API de usuários
  const USERS_API_BASE = '/api/usuarios';
  const THEME_KEY = 'projeto-coruja-theme';
  const Theme = { LIGHT: 'theme-light', DARK: 'theme-dark' };

  // Componentes do controle de tema presentes nos layouts
  const themeToggleButton = document.querySelector('[data-theme-toggle]');
  const themeToggleIcon = document.querySelector('[data-theme-icon]');
  const themeToggleLabel = document.querySelector('[data-theme-label]');

  // Define o tema inicial respeitando armazenamento local ou preferência do sistema
  const detectPreferredTheme = () => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === Theme.LIGHT || stored === Theme.DARK) return stored;

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? Theme.DARK
      : Theme.LIGHT;
  };

  // Aplica classes, cor de esquema e atualiza o rótulo do botão
  const applyTheme = (theme) => {
    const targetTheme = theme === Theme.LIGHT ? Theme.LIGHT : Theme.DARK;
    document.body.classList.remove(Theme.LIGHT, Theme.DARK);
    document.body.classList.add(targetTheme);
    document.documentElement.style.colorScheme = targetTheme === Theme.DARK ? 'dark' : 'light';

    const isLight = targetTheme === Theme.LIGHT;
    if (themeToggleButton) {
      themeToggleButton.setAttribute('aria-pressed', String(isLight));
    }
    if (themeToggleIcon) {
      themeToggleIcon.textContent = isLight ? '🌞' : '🌙';
    }
    if (themeToggleLabel) {
      themeToggleLabel.textContent = isLight ? 'Modo claro' : 'Modo escuro';
    }
  };

  // Alterna o tema ativo e persiste a escolha
  const toggleTheme = () => {
    const currentTheme = document.body.classList.contains(Theme.LIGHT)
      ? Theme.LIGHT
      : Theme.DARK;
    const nextTheme = currentTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  applyTheme(detectPreferredTheme());
  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', toggleTheme);
  }

  const form = document.getElementById('login-form');
  const messageEl = document.getElementById('message');
  const submitButton = form?.querySelector('button[type="submit"]');

  const profilePage =
    document.querySelector('[data-page="home"]') ||
    document.querySelector('[data-page="perfil"]') ||
    document.querySelector('[data-page="welcome"]');
  const profileMessageEl =
    document.getElementById('page-message') ||
    document.getElementById('welcome-message') ||
    document.getElementById('home-message');
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const userRoleEl = document.getElementById('user-role');
  const logoutButton = document.getElementById('logout-button');
  const profileForm = profilePage?.querySelector('form');
  const profileFeedbackEl = document.getElementById('feedback-area');
  const deleteAccountButton = profilePage?.querySelector('.button--danger');
  const profileNameInput = document.getElementById('input-name');
  const profileEmailInput = document.getElementById('input-email');
  const profilePasswordInput = document.getElementById('input-password');
  const profileRoleSelect = document.getElementById('select-role');

  const setMessage = (element, text, type = 'info') => {
    if (!element) return;

    element.textContent = text;
    element.className = 'message';

    if (text) {
      element.classList.add(`message--${type}`);
    }
  };

  const toggleLoading = (isLoading) => {
    if (!submitButton) return;

    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'Entrando...' : 'Entrar';
  };

  const setCookie = (name, value, maxAgeSeconds = 3600) => {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}`;
  };

  const clearCookie = (name) => {
    document.cookie = `${name}=; path=/; max-age=0`;
  };

  const getCookie = (name) => {
    return document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.split('=')[1];
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);

  const persistToken = (token) => {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
    setCookie(TOKEN_KEY, token);
  };

  const persistUser = (user) => {
    if (!user) return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const getStoredUser = () => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  };

  const decodeTokenPayload = (token) => {
    if (!token) return null;
    try {
      const payloadBase64 = token.split('.')[1];
      const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = atob(normalized);
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  const getUserIdFromToken = () => {
    const payload = decodeTokenPayload(getToken());
    return payload?.id;
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearCookie(TOKEN_KEY);
  };

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

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!form) return;

    const email = form.email.value.trim();
    const senha = form.senha.value.trim();

    if (!email || !senha) {
      setMessage(messageEl, 'Preencha e-mail e senha para continuar.', 'error');
      return;
    }

    toggleLoading(true);
    setMessage(messageEl, 'Realizando login...', 'info');

    try {
      const response = await fetch(`${USERS_API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          data?.mensagem || data?.message || 'Não foi possível efetuar o login.';
        throw new Error(errorMessage);
      }

      const token = data?.token;
      const usuario = data?.usuario;

      persistToken(token);
      if (usuario) persistUser(usuario);

      setMessage(messageEl, 'Login realizado com sucesso! Redirecionando...', 'success');
      setTimeout(() => {
        window.location.href = '/home';
      }, 800);
    } catch (error) {
      setMessage(
        messageEl,
        error?.message || 'Erro inesperado ao processar o login.',
        'error'
      );
    } finally {
      toggleLoading(false);
    }
  };

  const renderUserCard = (user) => {
    if (!profilePage) return;

    if (userNameEl) userNameEl.textContent = user?.nome || 'Usuário';
    if (userEmailEl) userEmailEl.textContent = user?.email || '—';
    if (userRoleEl) userRoleEl.textContent = user?.role || '—';
  };

  // Dashboard: seção "Usuários" (totais de Pessoas e por UF)
  const carregarDashboardUsuarios = async () => {
    const homePage = document.querySelector('[data-page="home"]');
    if (!homePage) return;

    const totalEl = document.getElementById('dash-total-pessoas');
    const faccaoEl = document.getElementById('dash-pessoas-faccao');
    const ufTbody = document.getElementById('dash-pessoas-por-uf');

    if (totalEl) totalEl.textContent = '—';
    if (faccaoEl) faccaoEl.textContent = '—';
    if (ufTbody) ufTbody.innerHTML = '<tr><td colspan="2" style="opacity:0.7;">Carregando...</td></tr>';

    try {
      const resp = await authorizedFetch('/api/dashboard/usuarios');
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.message || 'Falha ao carregar dashboard.');
      }

      if (totalEl) totalEl.textContent = String(data?.totalPessoas ?? 0);
      if (faccaoEl) faccaoEl.textContent = String(data?.pessoasComFaccao ?? 0);

      if (ufTbody) {
        const lista = Array.isArray(data?.pessoasPorUF) ? data.pessoasPorUF : [];
        if (!lista.length) {
          ufTbody.innerHTML = '<tr><td colspan="2" style="opacity:0.7;">Sem dados</td></tr>';
        } else {
          ufTbody.innerHTML = lista
            .map((r) => `<tr><td>${(r.uf || '—')}</td><td style="text-align:right;">${r.total}</td></tr>`)
            .join('');
        }
      }
    } catch (error) {
      if (ufTbody) ufTbody.innerHTML = `<tr><td colspan="2" style="color:var(--danger-600);">${error?.message || 'Erro'}</td></tr>`;
    }
  };

  // Preenche o formulário de edição de perfil com os dados disponíveis
  const fillProfileForm = (user) => {
    if (!profileForm || !user) return;

    if (profileNameInput) profileNameInput.value = user?.nome || '';
    if (profileEmailInput) profileEmailInput.value = user?.email || '';
    if (profileRoleSelect) profileRoleSelect.value = user?.role || '';
    if (profilePasswordInput) profilePasswordInput.value = '';
  };

  // CRUD: Obtém o usuário autenticado e sincroniza o estado local/DOM para leitura inicial
  const carregarPerfil = async () => {
    if (!profilePage) return;

    const token = getToken();
    if (!token) {
      clearAuth();
      window.location.href = '/';
      return;
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      renderUserCard(storedUser);
      fillProfileForm(storedUser);
    }

    const userId = storedUser?.id || getUserIdFromToken();

    if (!userId) {
      clearAuth();
      window.location.href = '/';
      return;
    }

    setMessage(profileMessageEl, 'Carregando informações do perfil...', 'info');

    try {
      const response = await authorizedFetch(`${USERS_API_BASE}/${userId}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth();
          window.location.href = '/';
          return;
        }
        const errorMessage =
          data?.mensagem || data?.message || 'Não foi possível obter o perfil.';
        throw new Error(errorMessage);
      }

      persistUser(data);
      renderUserCard(data);
      fillProfileForm(data);
    } catch (error) {
      setMessage(
        profileMessageEl,
        error?.message || 'Erro ao carregar as informações do usuário.',
        'error'
      );
    }
  };

  // CRUD: Atualiza o usuário logado enviando dados editados para a API e sincronizando o cache local
  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    if (!profileForm) return;

    const userId = getStoredUser()?.id || getUserIdFromToken();
    if (!userId) {
      clearAuth();
      window.location.href = '/';
      return;
    }

    const nome = profileNameInput?.value.trim();
    const email = profileEmailInput?.value.trim();
    const role = profileRoleSelect?.value;
    const senha = profilePasswordInput?.value.trim();

    // Indica se credenciais sensíveis foram modificadas para tratar renovação de sessão
    const alterouCredencialSensivel =
      Boolean(senha) || email !== getStoredUser()?.email;

    if (!nome || !email || !role) {
      setMessage(profileFeedbackEl, 'Preencha nome, e-mail e perfil para continuar.', 'error');
      return;
    }

    setMessage(profileFeedbackEl, 'Salvando alterações...', 'info');

    try {
      const payload = { nome, email, role };
      if (senha) payload.senha = senha;

      const response = await authorizedFetch(`${USERS_API_BASE}/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth();
          window.location.href = '/';
          return;
        }
        const errorMessage =
          data?.mensagem || data?.message || 'Não foi possível atualizar o perfil.';
        throw new Error(errorMessage);
      }

      const usuarioAtualizado = data?.usuario || data;
      const tokenRenovado = data?.token;

      // Quando API retorna um token novo, sincroniza imediatamente para manter sessão válida
      if (tokenRenovado) {
        persistToken(tokenRenovado);
      } else if (alterouCredencialSensivel) {
        setMessage(
          profileFeedbackEl,
          'Dados sensíveis alterados: faça login novamente para continuar.',
          'warning'
        );
      }

      persistUser(usuarioAtualizado);
      renderUserCard(usuarioAtualizado);
      fillProfileForm(usuarioAtualizado);
      if (profilePasswordInput) profilePasswordInput.value = '';

      setMessage(profileFeedbackEl, 'Perfil atualizado com sucesso!', 'success');
      setMessage(profileMessageEl, 'Dados sincronizados com sucesso.', 'success');
    } catch (error) {
      setMessage(
        profileFeedbackEl,
        error?.message || 'Erro ao salvar alterações do perfil.',
        'error'
      );
    }
  };

  // CRUD: Remove a conta do usuário chamando o endpoint de exclusão e limpando o estado local
  const handleDeleteAccount = async () => {
    const userId = getStoredUser()?.id || getUserIdFromToken();
    if (!userId) {
      clearAuth();
      window.location.href = '/';
      return;
    }

    setMessage(profileMessageEl, 'Removendo conta...', 'info');

    try {
      const response = await authorizedFetch(`${USERS_API_BASE}/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth();
          window.location.href = '/';
          return;
        }
        const errorMessage =
          data?.mensagem || data?.message || 'Não foi possível remover a conta.';
        throw new Error(errorMessage);
      }

      clearAuth();
      window.location.href = '/';
    } catch (error) {
      setMessage(
        profileMessageEl,
        error?.message || 'Erro ao remover a conta do usuário.',
        'error'
      );
    }
  };

  // Dispara carregamento de perfil e dashboard quando aplicável
  (async () => {
    await carregarPerfil();
    await carregarDashboardUsuarios();
  })();

  // Global: máscara e limite para todos os campos de telefone
  const aplicarMascaraTelefoneGlobal = (valor) => {
    const dig = String(valor || '').replace(/\D/g, '').slice(0, 11);
    if (dig.length <= 10) {
      return dig.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => {
        let r = '';
        if (a) r += '(' + a + ') ';
        if (b) r += b + (c ? '-' : '');
        if (c) r += c;
        return r;
      });
    }
    return dig.replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_, a, b, c) => {
      let r = '';
      if (a) r += '(' + a + ') ';
      if (b) r += b + (c ? '-' : '');
      if (c) r += c;
      return r;
    });
  };

  const isNavegacaoOuEdicao = (e) => {
    const k = e.key;
    return (
      k === 'Backspace' || k === 'Delete' || k === 'Tab' ||
      k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' ||
      k === 'Home' || k === 'End'
    );
  };

  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el && el.tagName === 'INPUT' && (el.type === 'tel' || el.name === 'telefone' || el.classList.contains('telefone'))) {
      try { el.setAttribute('inputmode', 'numeric'); } catch {}
      try { el.setAttribute('maxlength', '16'); } catch {}
      if (!el.placeholder) el.placeholder = '(XX) XXXXX-XXXX';
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el && el.tagName === 'INPUT' && (el.type === 'tel' || el.name === 'telefone' || el.classList.contains('telefone'))) {
      el.value = aplicarMascaraTelefoneGlobal(el.value || '');
    }
  });

  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!(el && el.tagName === 'INPUT' && (el.type === 'tel' || el.name === 'telefone' || el.classList.contains('telefone')))) return;
    if (isNavegacaoOuEdicao(e)) return;
    const selLen = Math.abs((el.selectionEnd || 0) - (el.selectionStart || 0));
    const digits = String(el.value || '').replace(/\D/g, '');
    // Bloqueia novas entradas de dígitos quando já há 11 e não há seleção substituindo
    if (/^\d$/.test(e.key) && digits.length >= 11 && selLen === 0) {
      e.preventDefault();
    }
  });

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/';
  };

  form?.addEventListener('submit', handleLogin);
  logoutButton?.addEventListener('click', handleLogout);

  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSubmit);
  }

  if (deleteAccountButton) {
    deleteAccountButton.addEventListener('click', handleDeleteAccount);
  }

  if (profilePage) {
    carregarPerfil();
  }

  // Recolhe submenus (details) ao clicar em Home;
  // se já estiver na Home, evita recarregar a página.
  const collapseSidebarSubmenus = () => {
    document
      .querySelectorAll('details.sidebar__section[open]')
      .forEach((d) => d.removeAttribute('open'));
  };

  const homeLink = document.querySelector('.sidebar__nav a.sidebar__link[href="/home"]');
  if (homeLink) {
    homeLink.addEventListener('click', (e) => {
      collapseSidebarSubmenus();
      if (window.location?.pathname === '/home') {
        e.preventDefault();
      }
    });
  }

  const getCurrentRole = () => {
    const stored = getStoredUser();
    if (stored?.role) return String(stored.role);
    const payload = decodeTokenPayload(getToken());
    return payload?.role || null;
  };

  const showDenied = () => alert('Ação não permitida. Contate o Administrador!');

  const enforceRoleRestrictions = () => {
    const role = (getCurrentRole() || '').toLowerCase();
    const isViewer = role === 'viewer' || role === 'leitor' || role === 'reader';
    const isEditor = role === 'editor';

    // Bloqueia ações de exclusão para não-admin (Editor/Viewer)
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.button--danger')) {
        // botão de excluir ou ação destrutiva
        if (isEditor || isViewer) {
          e.preventDefault();
          e.stopPropagation();
          showDenied();
        }
      }
    }, true);

    // Modo somente leitura para Viewer em áreas de conteúdo
    if (isViewer) {
      const content = document.querySelector('main.content');
      if (content) {
        content.querySelectorAll('input, select, textarea, button[type="submit"], button.button--secondary')
          .forEach((el) => {
            el.disabled = true;
            el.setAttribute('aria-disabled', 'true');
          });
        // Bloqueia qualquer submit
        content.addEventListener('submit', (ev) => {
          ev.preventDefault();
          showDenied();
        }, true);
      }
      // Esconde botões de adicionar comuns
      document.querySelectorAll('#abrir-usuario-modal').forEach((el) => el.setAttribute('hidden', 'true'));
    }
  };

  // Aplica as restrições após carregar a página
  try { enforceRoleRestrictions(); } catch {}

  // ==== User Menu (top-right) ====
  const userMenu = document.getElementById('user-menu');
  const userMenuBtn = document.getElementById('user-menu-button');
  const userMenuDropdown = document.getElementById('user-menu-dropdown');
  const userButtonName = document.getElementById('user-button-name');
  const userAvatar = document.getElementById('user-avatar');
  const umNome = document.getElementById('um-nome');
  const umEmail = document.getElementById('um-email');
  const umPerfil = document.getElementById('um-perfil');
  const umAlterarSenha = document.getElementById('um-alterar-senha');
  const umSair = document.getElementById('um-sair');

  const roleLabel = (role) => {
    const r = String(role || '').toLowerCase();
    if (r === 'admin') return 'Administrador';
    if (r === 'editor') return 'Editor';
    if (r === 'viewer' || r === 'leitor' || r === 'reader') return 'Leitor';
    return role || '—';
  };

  const initUserMenu = () => {
    const user = getStoredUser();
    if (!userMenu || !user) return;

    const nome = user?.nome || 'Usuário';
    if (userButtonName) userButtonName.textContent = nome.split(' ')[0] || nome;
    if (userAvatar) userAvatar.textContent = (nome[0] || 'U').toUpperCase();

    if (umNome) umNome.textContent = nome;
    if (umEmail) umEmail.textContent = user?.email || '—';
    if (umPerfil) umPerfil.textContent = roleLabel(user?.role);

    const toggle = () => {
      const expanded = userMenu.getAttribute('aria-expanded') === 'true';
      userMenu.setAttribute('aria-expanded', String(!expanded));
      userMenuBtn?.setAttribute('aria-expanded', String(!expanded));
    };

    userMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    document.addEventListener('click', (e) => {
      if (!userMenu.contains(e.target)) {
        userMenu.setAttribute('aria-expanded', 'false');
        userMenuBtn?.setAttribute('aria-expanded', 'false');
      }
    });

    umSair?.addEventListener('click', () => handleLogout());
  };

  // ==== Alterar Senha Modal ====
  const senhaModal = document.getElementById('alterar-senha-modal');
  const senhaClose = document.getElementById('alterar-senha-close');
  const senhaCancelar = document.getElementById('alterar-senha-cancelar');
  const senhaForm = document.getElementById('alterar-senha-form');
  const senhaAtualInput = document.getElementById('senha-atual');
  const senhaNovaInput = document.getElementById('senha-nova');

  const openSenhaModal = () => {
    if (!senhaModal) return;
    senhaModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => senhaAtualInput?.focus(), 50);
  };
  const closeSenhaModal = () => {
    if (!senhaModal) return;
    senhaModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (senhaForm) senhaForm.reset();
  };

  document.querySelector('#alterar-senha-modal [data-modal-close]')?.addEventListener('click', closeSenhaModal);
  senhaClose?.addEventListener('click', closeSenhaModal);
  senhaCancelar?.addEventListener('click', closeSenhaModal);

  umAlterarSenha?.addEventListener('click', () => openSenhaModal());

  senhaForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const atual = senhaAtualInput?.value.trim();
    const nova = senhaNovaInput?.value.trim();
    if (!atual || !nova) return;
    const userId = getStoredUser()?.id || getUserIdFromToken();
    if (!userId) return;
    try {
      const response = await authorizedFetch(`${USERS_API_BASE}/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual: atual, senhaNova: nova }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.mensagem || data?.message || 'Não foi possível alterar a senha.';
        throw new Error(msg);
      }
      if (data?.token) persistToken(data.token);
      if (data?.usuario) persistUser(data.usuario);
      alert('Senha alterada com sucesso!');
      closeSenhaModal();
    } catch (err) {
      alert(err?.message || 'Falha ao alterar a senha.');
    }
  });

  try { initUserMenu(); } catch {}

  // Oculta item "Usuários" no menu da Home para não-admin
  (function hideAdminOnlyMenuOnHome() {
    try {
      if (window.location?.pathname !== '/home') return;
      const role = (getCurrentRole() || '').toLowerCase();
      if (role === 'admin') return;
      const usuariosLink = document.querySelector('.sidebar__nav a.sidebar__link[href="/usuarios"]');
      if (usuariosLink) usuariosLink.style.display = 'none';
    } catch {}
  })();
})();
