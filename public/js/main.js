(function () {
  const form = document.getElementById('login-form');
  const messageEl = document.getElementById('message');
  const submitButton = form?.querySelector('button[type="submit"]');

  const setMessage = (text, type = 'info') => {
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.className = 'message';

    if (text) {
      messageEl.classList.add(`message--${type}`);
    }
  };

  const toggleLoading = (isLoading) => {
    if (!submitButton) return;

    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'Entrando...' : 'Entrar';
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!form) return;

    const email = form.email.value.trim();
    const senha = form.senha.value.trim();

    if (!email || !senha) {
      setMessage('Preencha e-mail e senha para continuar.', 'error');
      return;
    }

    toggleLoading(true);
    setMessage('Realizando login...', 'info');

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

      if (token) {
        localStorage.setItem('authToken', token);
      }

      setMessage('Login realizado com sucesso! Redirecionando...', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      setMessage(error?.message || 'Erro inesperado ao processar o login.', 'error');
    } finally {
      toggleLoading(false);
    }
  };

  form?.addEventListener('submit', handleLogin);
})();
