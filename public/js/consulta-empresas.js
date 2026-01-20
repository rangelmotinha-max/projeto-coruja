(function () {
  // Script de consulta de empresas: monta filtros, autentica requisição e exibe sócios vinculados.
  const TOKEN_KEY = 'authToken';
  const form = document.querySelector('[data-empresas-form]');
  const resultsMessage = document.querySelector('[data-results-message]');
  const resultsContainer = document.querySelector('[data-results-container]');
  // Pesquisa Geral é realizada via submit, semelhante à página de pessoas.

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
      endereco: formData.get('endereco'),
      cep: formData.get('cep'),
      pesquisaGeral: formData.get('pesquisaGeral'),
    };

    Object.entries(filtros).forEach(([chave, valor]) => {
      const normalizado = (valor || '').trim();
      if (normalizado) {
        params.append(chave, normalizado);
      }
    });

    return params;
  };

  // Utilidades para normalização e comparação
  const onlyDigits = (s) => String(s || '').replace(/\D+/g, '');
  const norm = (s) => String(s || '').toLowerCase();

  // Pesquisa geral em todos os campos do cadastro de empresas
  const filterByGlobalTerm = (empresas, termo) => {
    const q = norm(termo || '').trim();
    const qDigits = onlyDigits(q);
    if (!q) return [...empresas];

    const matchEnderecoArray = (enderecos) => {
      if (!Array.isArray(enderecos)) return false;
      return enderecos.some((e) => {
        const uf = norm(e.uf);
        const logradouro = norm(e.logradouro);
        const bairro = norm(e.bairro);
        const complemento = norm(e.complemento);
        const latLong = norm(e.latLong);
        const cep = onlyDigits(e.cep);
        return (
          uf.includes(q) ||
          logradouro.includes(q) ||
          bairro.includes(q) ||
          complemento.includes(q) ||
          latLong.includes(q) ||
          (qDigits && cep.includes(qDigits))
        );
      });
    };

    const matchSociosArray = (socios) => {
      if (!Array.isArray(socios)) return false;
      return socios.some((s) => {
        const nome = norm(s.nome);
        const cpfDigits = onlyDigits(s.cpf);
        return nome.includes(q) || (qDigits && cpfDigits.includes(qDigits));
      });
    };

    const matchVeiculosArray = (veiculos) => {
      if (!Array.isArray(veiculos)) return false;
      return veiculos.some((v) => {
        const placa = norm(v.placa);
        const marcaModelo = norm(v.marcaModelo);
        const cor = norm(v.cor);
        const anoModelo = String(v.anoModelo || '').toLowerCase();
        return (
          placa.includes(q) ||
          marcaModelo.includes(q) ||
          cor.includes(q) ||
          (!!anoModelo && anoModelo.includes(q))
        );
      });
    };

    return empresas.filter((e) => {
      const razao = norm(e.razaoSocial);
      const fantasia = norm(e.nomeFantasia);
      const situacao = norm(e.situacaoCadastral);
      const natureza = norm(e.naturezaJuridica);
      const obs = norm(e.obs);
      const dataInicio = norm(e.dataInicioAtividade);
      const telefoneDigits = onlyDigits(e.telefone);
      const cnpjDigits = onlyDigits(e.cnpj);

      const textoMatch = (
        razao.includes(q) ||
        fantasia.includes(q) ||
        situacao.includes(q) ||
        natureza.includes(q) ||
        obs.includes(q) ||
        dataInicio.includes(q)
      );

      const digitosMatch = (
        (qDigits && cnpjDigits.includes(qDigits)) ||
        (qDigits && telefoneDigits.includes(qDigits))
      );

      const sociosMatch = matchSociosArray(e.socios);
      const enderecosMatch = matchEnderecoArray(e.enderecos);
      const veiculosMatch = matchVeiculosArray(e.veiculos);

      return textoMatch || digitosMatch || sociosMatch || enderecosMatch || veiculosMatch;
    });
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
  const formatEnderecos = (enderecos) => {
    if (!Array.isArray(enderecos) || enderecos.length === 0) return '—';
    return enderecos.map((e) => {
      const partes = [e.uf, e.logradouro, e.bairro].filter(Boolean).join(', ');
      const cep = e.cep ? ` CEP: ${e.cep}` : '';
      return `${partes}${cep}`.trim() || '—';
    }).join(' | ');
  };

  const formatVeiculos = (veiculos) => {
    if (!Array.isArray(veiculos) || veiculos.length === 0) return '—';
    const placas = veiculos.map(v => v.placa).filter(Boolean);
    return placas.length ? placas.join(' | ') : '—';
  };

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
    ['Razão Social', 'CNPJ', 'Telefone', 'Endereços', 'Sócios', 'Veículos', 'Ações'].forEach((heading) => {
      const th = document.createElement('th');
      th.textContent = heading;
      if (heading === 'Ações') th.style.textAlign = 'center';
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
      row.appendChild(createCell(formatEnderecos(empresa.enderecos)));
      row.appendChild(createCell(formatSocios(empresa.socios)));
      row.appendChild(createCell(formatVeiculos(empresa.veiculos)));

      // Coluna de ações: abrir cadastro da empresa em nova aba
      const actionsCell = document.createElement('td');
      actionsCell.className = 'table__actions';
      actionsCell.style.textAlign = 'center';
      const empresaId = empresa.id || empresa._id || '';
      if (empresaId) {
        const openLink = document.createElement('a');
        openLink.textContent = 'Abrir';
        openLink.href = `/cadastro/empresas?empresaId=${encodeURIComponent(empresaId)}`;
        openLink.target = '_blank';
        openLink.rel = 'noopener noreferrer';
        openLink.className = 'button button--secondary';
        openLink.title = 'Abrir cadastro em nova aba';
        const wrapper = document.createElement('div');
        wrapper.style.display = 'inline-flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.gap = '0.5rem';
        wrapper.appendChild(openLink);
        actionsCell.appendChild(wrapper);
      } else {
        actionsCell.textContent = '—';
      }
      row.appendChild(actionsCell);
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
      const termoGeral = (formData.get('pesquisaGeral') || '').trim();
      if (termoGeral) {
        const filtradas = filterByGlobalTerm(Array.isArray(data) ? data : (data?.data || []), termoGeral);
        renderResults(filtradas);
        setMessage(`Exibindo ${filtradas.length} resultado(s) para "${termoGeral}".`, 'success');
      } else {
        renderResults(data);
      }
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

  // Pesquisa geral é acionada via submissão do formulário.
})();
