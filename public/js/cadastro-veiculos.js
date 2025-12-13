(function () {
  const TOKEN_KEY = 'authToken';
  const API_URL = '/api/veiculos';

  // Referências de UI utilizadas no fluxo
  const form = document.getElementById('veiculo-form');
  const messageEl = document.getElementById('veiculo-form-message');
  const cpfErro = document.getElementById('cpf-erro');
  const listaEl = document.getElementById('veiculos-lista');

  // Utilitário para limpar/ocultar mensagens
  const setMessage = (text, type = 'info') => {
    if (!messageEl) return;
    messageEl.textContent = text || '';
    messageEl.className = 'message';
    if (text) messageEl.classList.add(`message--${type}`);
  };

  // Recupera token salvo para assinar as requisições
  const getToken = () => {
    const cookieToken = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${TOKEN_KEY}=`))
      ?.split('=')[1];
    return localStorage.getItem(TOKEN_KEY) || cookieToken;
  };

  // Envelopa fetch adicionando Authorization automaticamente
  const authorizedFetch = (url, options = {}) => {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...options, headers });
  };

  // Formata CPF para exibição amigável
  const formatarCpf = (cpf) => {
    const digitos = String(cpf || '').replace(/\D/g, '');
    if (digitos.length !== 11) return cpf || '—';
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  };

  // Validação simples replicando a regra do backend
  const validarCpf = (cpf) => {
    const numeros = String(cpf || '').replace(/\D/g, '');
    if (numeros.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(numeros)) return false;
    const calcular = (base) => {
      let soma = 0;
      for (let i = 0; i < base.length; i += 1) {
        soma += parseInt(base[i], 10) * (base.length + 1 - i);
      }
      const resto = soma % 11;
      return resto < 2 ? '0' : String(11 - resto);
    };
    const d1 = calcular(numeros.slice(0, 9));
    const d2 = calcular(numeros.slice(0, 10));
    return numeros[9] === d1 && numeros[10] === d2;
  };

  // Renderiza lista de veículos com fallback quando vazio
  const renderizarVeiculos = (veiculos = []) => {
    if (!listaEl) return;
    if (!veiculos.length) {
      listaEl.innerHTML = '<div class="table__row"><span>Nenhum veículo cadastrado.</span></div>';
      return;
    }

    const linhas = veiculos
      .map(
        (v) => `
          <div class="table__row">
            <span>${v.proprietario || '—'}</span>
            <span>${formatarCpf(v.cpf)}</span>
            <span>${v.marcaModelo || '—'}</span>
            <span>${(v.placa || '—').toUpperCase()}</span>
            <span>${v.cor || '—'}</span>
            <span>${v.anoModelo || '—'}</span>
            <span>${v.fotoUrl ? `<a href="${v.fotoUrl}" target="_blank" rel="noopener">Ver foto</a>` : '—'}</span>
          </div>`
      )
      .join('');
    listaEl.innerHTML = linhas;
  };

  // Consulta a API e atualiza a tabela
  const carregarVeiculos = async () => {
    try {
      const resposta = await authorizedFetch(API_URL);
      const dados = await resposta.json().catch(() => []);
      if (!resposta.ok) throw new Error('Não foi possível carregar os veículos.');
      renderizarVeiculos(Array.isArray(dados) ? dados : []);
    } catch (error) {
      setMessage(error.message || 'Falha ao buscar veículos.', 'error');
    }
  };

  // Fluxo principal do submit do formulário
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (cpfErro) cpfErro.style.display = 'none';

    const formData = new FormData(form);
    const cpf = formData.get('cpf');
    if (!validarCpf(cpf)) {
      if (cpfErro) cpfErro.style.display = 'block';
      setMessage('CPF inválido. Revise os números digitados.', 'error');
      return;
    }

    try {
      const resposta = await authorizedFetch(API_URL, {
        method: 'POST',
        body: formData,
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        const msg = dados?.mensagem || dados?.message || 'Não foi possível salvar o veículo.';
        throw new Error(msg);
      }
      setMessage('Veículo salvo com sucesso!', 'success');
      form.reset();
      await carregarVeiculos();
    } catch (error) {
      setMessage(error.message || 'Erro ao salvar veículo.', 'error');
    }
  };

  form?.addEventListener('submit', handleSubmit);
  carregarVeiculos();
})();
