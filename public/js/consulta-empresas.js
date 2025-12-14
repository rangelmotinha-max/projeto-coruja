(function () {
  // Script de consulta de empresas: monta filtros, autentica requisição e exibe sócios vinculados.
  const TOKEN_KEY = 'authToken';
  const form = document.querySelector('[data-empresas-form]');
  const resultsMessage = document.querySelector('[data-results-message]');
  const resultsContainer = document.querySelector('[data-results-container]');

  // Recupera token armazenado localmente ou em cookie para compor o header Authorization.
  const getCookie = (name) => {
    return document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.split('=')[1];
  };
  const getToken = () => localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);

  // Envelopa fetch adicionando o JWT quando existir, garantindo compatibilidade com páginas protegidas.
  const authorizedFetch = (url, options = {}) => {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...options, headers });
  };

  // Controla mensagens de feedback para o usuário mantendo classes de estilo reutilizáveis.
  const setMessage = (text, type = 'info') => {
    if (!resultsMessage) return;
    resultsMessage.textContent = text;
    resultsMessage.className = 'message';
    if (text) {
      resultsMessage.classList.add(`message--${type}`);
    }
  };

  // Constrói querystring apenas com campos preenchidos para evitar parâmetros vazios na API.
  const buildQueryParams = (formData) => {
    const params = new URLSearchParams();
    const filtros = {
      cnpj: formData.get('cnpj'),
      razaoSocial: formData.get('razaoSocial'),
      socio: formData.get('socio'),
    };

    Object.entries(filtros).forEach(([chave, valor]) => {
      const normalizado = (valor || '').trim();
      if (normalizado) {
        params.append(chave, normalizado);
      }
    });

    return params;
  };

  // Monta célula de tabela com fallback e classe opcional para reutilizar na renderização.
  const createCell = (text, className = '') => {
    const cell = document.createElement('td');
    cell.textContent = text || '—';
    if (className) cell.className = className;
    return cell;
  };

  // Concatena lista de sócios em texto legível exibindo nome e CPF quando disponível.
  const formatSocios = (socios) => {
    if (!Array.isArray(socios) || socios.length === 0) return '—';
    return socios
      .map((socio) => {
        const nome = socio.nome || 'Sócio sem nome';
        const cpf = socio.cpf ? ` (CPF: ${socio.cpf})` : '';
        return `${nome}${cpf}`;
      })
      .join(' | ');
  };

  // Renderiza tabela de resultados contemplando dados principais e os sócios associados.
  const renderResults = (empresas) => {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    if (!Array.isArray(empresas) || empresas.length === 0) {
      setMessage('Nenhum resultado encontrado para os filtros informados.', 'info');
      return;
    }

    const table = document.createElement('table');
    table.className = 'table table--results';

    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Razão Social', 'CNPJ', 'Telefone', 'Sócios'].forEach((heading) => {
      const th = document.createElement('th');
      th.textContent = heading;
      headerRow.appendChild(th);
    });
    header.appendChild(headerRow);
    table.appendChild(header);

    const body = document.createElement('tbody');
    empresas.forEach((empresa) => {
      const row = document.createElement('tr');
      row.appendChild(createCell(empresa.razaoSocial || empresa.nomeFantasia || 'Empresa sem razão social'));
      row.appendChild(createCell(empresa.cnpj));
      row.appendChild(createCell(empresa.telefone));
      row.appendChild(createCell(formatSocios(empresa.socios)));
      body.appendChild(row);
    });

    table.appendChild(body);
    resultsContainer.appendChild(table);
    setMessage('Consulta realizada com sucesso.', 'success');
  };

  // Limpa área de resultados e restaura mensagem neutra.
  const clearResults = (message = 'Aguardando consulta...') => {
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
    setMessage(message, 'info');
  };

  // Submissão principal: monta filtros, chama API autenticada e trata retorno.
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form) return;

    const formData = new FormData(form);
    const params = buildQueryParams(formData);
    const queryString = params.toString();
    const endpoint = queryString ? `/api/empresas?${queryString}` : '/api/empresas';

    setMessage('Consultando empresas, aguarde...', 'info');
    clearResults('Carregando resultados...');

    try {
      const response = await authorizedFetch(endpoint, { method: 'GET' });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        const message = data?.message || 'Não foi possível concluir a consulta de empresas.';
        setMessage(message, 'error');
        return;
      }

      renderResults(data);
    } catch (error) {
      // Mensagem resiliente para falhas de rede ou parsing inesperado.
      setMessage('Erro de comunicação com a API. Tente novamente em instantes.', 'error');
    }
  };

  // Reset do formulário devolve estado limpo e mensagem de orientação.
  const handleReset = () => {
    clearResults('Filtros limpos. Preencha novamente para consultar.');
  };

  if (form) {
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', handleReset);
  }
})();
