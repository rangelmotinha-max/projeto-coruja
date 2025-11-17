(function () {
  const TOKEN_KEY = 'authToken';
  const USER_KEY = 'authUser';

  const form = document.getElementById('login-form');
  const messageEl = document.getElementById('message');
  const submitButton = form?.querySelector('button[type="submit"]');

  const homePage = document.querySelector('[data-page="home"]');
  const homeMessageEl = document.getElementById('home-message');
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const userRoleEl = document.getElementById('user-role');
  const logoutButton = document.getElementById('logout-button');

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
      const response = await fetch('/usuarios/login', {
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
    if (!homePage) return;

    if (userNameEl) userNameEl.textContent = user?.nome || 'Usuário';
    if (userEmailEl) userEmailEl.textContent = user?.email || '—';
    if (userRoleEl) userRoleEl.textContent = user?.role || '—';
  };

  const carregarPerfil = async () => {
    if (!homePage) return;

    const token = getToken();
    if (!token) {
      clearAuth();
      window.location.href = '/';
      return;
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      renderUserCard(storedUser);
    }

    const userId = storedUser?.id || getUserIdFromToken();

    if (!userId) {
      clearAuth();
      window.location.href = '/';
      return;
    }

    setMessage(homeMessageEl, 'Carregando informações do perfil...', 'info');

    try {
      const response = await authorizedFetch(`/usuarios/${userId}`);
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
      setMessage(homeMessageEl, 'Perfil atualizado com sucesso.', 'success');
    } catch (error) {
      setMessage(
        homeMessageEl,
        error?.message || 'Erro ao carregar as informações do usuário.',
        'error'
      );
    }
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/';
  };

  form?.addEventListener('submit', handleLogin);
  logoutButton?.addEventListener('click', handleLogout);

  if (homePage) {
    carregarPerfil();
  }
})();
