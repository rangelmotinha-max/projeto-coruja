(function () {
  // Script dedicado à consulta de veículos: lê o formulário, monta filtros e consome a API autenticada.
  const TOKEN_KEY = 'authToken';

  const form = document.querySelector('[data-veiculos-form]');
  const resultsMessage = document.querySelector('[data-results-message]');
  const resultsContainer = document.querySelector('[data-results-container]');

  // Recupera cookie pelo nome para dar suporte a sessões persistidas.
  const getCookie = (name) => {
    return document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.split('=')[1];
  };

  // Obtém token tanto do localStorage quanto do cookie, priorizando armazenamento local.
  const getToken = () => localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);

  // Realiza fetch com cabeçalho Authorization sempre que houver token disponível.
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

  // Atualiza mensagem de status com classes utilitárias para feedback visual.
  const setMessage = (text, type = 'info') => {
    if (!resultsMessage) return;

    resultsMessage.textContent = text;
    resultsMessage.className = 'message';

    if (text) {
      resultsMessage.classList.add(`message--${type}`);
    }
  };

  // Constrói query string apenas com campos preenchidos no formulário de consulta.
  const buildQueryParams = (formData) => {
    const params = new URLSearchParams();
    const rawFields = {
      placa: formData.get('placa'),
      nomeProprietario: formData.get('nomeProprietario'),
      cpf: formData.get('cpf'),
      marcaModelo: formData.get('marcaModelo'),
    };

    Object.entries(rawFields).forEach(([key, value]) => {
      const normalized = (value || '').trim();
      if (normalized) {
        params.append(key, normalized);
      }
    });

    return params;
  };

  // Gera célula de tabela com fallback para valores ausentes.
  const createCell = (text, className = '') => {
    const cell = document.createElement('td');
    cell.textContent = text || '—';
    if (className) cell.className = className;
    return cell;
  };

  // Renderiza os resultados em tabela ou exibe mensagem de ausência quando necessário.
  const renderResults = (veiculos) => {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    if (!Array.isArray(veiculos) || veiculos.length === 0) {
      setMessage('Veículo não encontrado!', 'warning');
      return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    tableWrapper.setAttribute('role', 'region');
    tableWrapper.setAttribute('aria-label', 'Tabela de veículos');

    const table = document.createElement('table');
    table.className = 'table table--results';

    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Placa', 'Marca/Modelo', 'Nome do Proprietário', 'CPF', 'Ações'].forEach((heading) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = heading;
      headerRow.appendChild(th);
    });
    header.appendChild(headerRow);
    table.appendChild(header);

    const body = document.createElement('tbody');

    veiculos.forEach((veiculo) => {
      const row = document.createElement('tr');
      row.appendChild(createCell(veiculo.placa ? veiculo.placa.toUpperCase() : null));
      row.appendChild(createCell(veiculo.marcaModelo));
      row.appendChild(createCell(veiculo.nomeProprietario));
      row.appendChild(createCell(veiculo.cpf));

      // Coluna de ações: abrir cadastro de veículo em nova aba
      const actionsCell = document.createElement('td');
      actionsCell.className = 'table__actions';
      const placa = veiculo.placa || null;
      const cpf = veiculo.cpf || null;
      if (placa || cpf) {
        const openLink = document.createElement('a');
        openLink.textContent = 'Abrir';
        const params = new URLSearchParams();
        if (placa) params.set('placa', String(placa).toUpperCase());
        else if (cpf) params.set('cpf', String(cpf));
        openLink.href = `/cadastro/veiculos?${params.toString()}`;
        openLink.target = '_blank';
        openLink.rel = 'noopener noreferrer';
        openLink.className = 'button button--secondary';
        openLink.title = 'Abrir cadastro em nova aba';
        actionsCell.appendChild(openLink);
      } else {
        actionsCell.textContent = '—';
      }
      row.appendChild(actionsCell);
      body.appendChild(row);
    });

    table.appendChild(body);
    tableWrapper.appendChild(table);
    resultsContainer.appendChild(tableWrapper);
    setMessage('Consulta de veículos realizada com sucesso.', 'success');
  };

  // Limpa a área de resultados mantendo mensagem neutra.
  const clearResults = (message = 'Aguardando consulta...') => {
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
    setMessage(message, 'info');
  };

  // Fluxo principal ao submeter: monta filtros, chama API autenticada e exibe feedback.
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form) return;

    const formData = new FormData(form);
    const params = buildQueryParams(formData);
    const queryString = params.toString();

    const buscaEndpoint = '/api/veiculos/buscar';
    const endpoint = queryString ? `${buscaEndpoint}?${queryString}` : buscaEndpoint;

    setMessage('Consultando veículos, por favor aguarde...', 'info');
    clearResults('Carregando resultados...');

    try {
      const response = await authorizedFetch(endpoint, { method: 'GET' });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        const errorMessage = data?.message || 'Não foi possível concluir a consulta de veículos.';
        setMessage(errorMessage, 'error');
        return;
      }

      renderResults(data);
    } catch (error) {
      setMessage('Erro de comunicação com a API. Tente novamente em instantes.', 'error');
    }
  };

  // Restabelece estado inicial ao limpar filtros.
  const handleReset = () => {
    clearResults('Filtros limpos. Preencha novamente para consultar.');
  };

  if (form) {
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', handleReset);
  }
})();
