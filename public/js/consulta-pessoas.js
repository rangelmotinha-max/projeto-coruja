(function () {
  // Script dedicado à consulta de pessoas: captura o formulário, monta os filtros e consome a API autenticada.
  const TOKEN_KEY = 'authToken';

  const form = document.querySelector('[data-pessoas-form]');
  const resultsMessage = document.querySelector('[data-results-message]');
  const resultsContainer = document.querySelector('[data-results-container]');

  // Recupera cookie pelo nome para manter compatibilidade com autenticação persistida.
  const getCookie = (name) => {
    return document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.split('=')[1];
  };

  // Obtém o token JWT tanto do localStorage quanto do cookie, priorizando persistência local.
  const getToken = () => localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);

  // Realiza fetch com cabeçalho Authorization quando existir token disponível.
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

  // Atualiza o elemento de status com classes utilitárias, preservando feedback para leitores de tela.
  const setMessage = (text, type = 'info') => {
    if (!resultsMessage) return;

    resultsMessage.textContent = text;
    resultsMessage.className = 'message';

    if (text) {
      resultsMessage.classList.add(`message--${type}`);
    }
  };

  // Constrói os parâmetros de consulta aproveitando apenas campos preenchidos pelo usuário.
  const buildQueryParams = (formData) => {
    const params = new URLSearchParams();
    const rawFields = {
      nome: formData.get('nome'),
      documento: formData.get('documento'),
      dataNascimento: formData.get('dataNascimento'),
      mae: formData.get('mae'),
      pai: formData.get('pai'),
      telefone: formData.get('telefone'),
      email: formData.get('email'),
    };

    Object.entries(rawFields).forEach(([key, value]) => {
      const normalized = (value || '').trim();
      if (normalized) {
        params.append(key, normalized);
      }
    });

    return params;
  };

  // Constrói célula de tabela com fallback de valor e classe opcional.
  const createCell = (text, className = '') => {
    const cell = document.createElement('td');
    cell.textContent = text || '—';
    if (className) cell.className = className;
    return cell;
  };

  // Renderiza os resultados em uma tabela simples com as informações principais.
  const renderResults = (pessoas) => {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    if (!Array.isArray(pessoas) || pessoas.length === 0) {
      setMessage('Nenhum resultado encontrado para os filtros informados.', 'info');
      return;
    }

    const table = document.createElement('table');
    table.className = 'table table--results';

    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Nome', 'Documentos', 'Contatos', 'Nascimento', 'Filiação'].forEach((heading) => {
      const th = document.createElement('th');
      th.textContent = heading;
      headerRow.appendChild(th);
    });
    header.appendChild(headerRow);
    table.appendChild(header);

    const body = document.createElement('tbody');

    pessoas.forEach((pessoa) => {
      const row = document.createElement('tr');

      // Combinação de nome completo e apelido para facilitar a identificação.
      const nomePrincipal = pessoa.nomeCompleto || pessoa.nome || 'Sem nome cadastrado';
      const apelido = pessoa.apelido ? ` ("${pessoa.apelido}")` : '';

      // Consolidação de documentos possíveis em um único campo textual.
      const documentos = [pessoa.cpf, pessoa.rg, pessoa.cnh]
        .filter(Boolean)
        .join(' • ');

      // Telefone pode existir tanto como campo único quanto lista agregada; ambos são contemplados.
      const telefones = Array.isArray(pessoa.telefones) && pessoa.telefones.length
        ? pessoa.telefones.join(', ')
        : pessoa.telefone;

      // Emails são retornados como array na API; fallback para string simples quando necessário.
      const emails = Array.isArray(pessoa.emails) && pessoa.emails.length
        ? pessoa.emails.join(', ')
        : pessoa.email;

      const contatos = [telefones, emails].filter(Boolean).join(' | ');
      const filiacao = [pessoa.nomeMae, pessoa.nomePai].filter(Boolean).join(' / ');

      row.appendChild(createCell(`${nomePrincipal}${apelido}`));
      row.appendChild(createCell(documentos));
      row.appendChild(createCell(contatos));
      row.appendChild(createCell(pessoa.dataNascimento));
      row.appendChild(createCell(filiacao));

      body.appendChild(row);
    });

    table.appendChild(body);
    resultsContainer.appendChild(table);
    setMessage('Consulta realizada com sucesso.', 'success');
  };

  // Limpa a área de resultados e exibe mensagem neutra para indicar ausência de dados.
  const clearResults = (message = 'Aguardando consulta...') => {
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
    setMessage(message, 'info');
  };

  // Fluxo principal ao submeter: evita reload, monta filtros e executa requisição autenticada.
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form) return;

    const formData = new FormData(form);
    const params = buildQueryParams(formData);
    const queryString = params.toString();
    const endpoint = queryString ? `/api/pessoas?${queryString}` : '/api/pessoas';

    setMessage('Consultando registros, por favor aguarde...', 'info');
    clearResults('Carregando resultados...');

    try {
      const response = await authorizedFetch(endpoint, { method: 'GET' });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        const errorMessage = data?.message || 'Não foi possível concluir a consulta de pessoas.';
        setMessage(errorMessage, 'error');
        return;
      }

      renderResults(data);
    } catch (error) {
      // Captura falhas de rede ou parsing inesperado e orienta o usuário a tentar novamente.
      setMessage('Erro de comunicação com a API. Tente novamente em instantes.', 'error');
    }
  };

  // Reseta filtros e remove qualquer listagem renderizada, evitando ruído visual.
  const handleReset = () => {
    clearResults('Filtros limpos. Preencha novamente para consultar.');
  };

  if (form) {
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', handleReset);
  }
})();
