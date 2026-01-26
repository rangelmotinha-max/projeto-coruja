(function () {
  // Script dedicado à consulta de entidades: monta filtros, consome API autenticada e renderiza tabela.
  const TOKEN_KEY = 'authToken';

  const form = document.querySelector('[data-entidades-form]');
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
      cnpj: formData.get('cnpj'),
      lider: formData.get('lider'),
      telefone: formData.get('telefone'),
      endereco: formData.get('endereco'),
      veiculos: formData.get('veiculos'),
      pesquisaGeral: formData.get('pesquisaGeral'),
    };

    Object.entries(rawFields).forEach(([key, value]) => {
      const normalized = (value || '').trim();
      if (normalized) {
        if (key === 'pesquisaGeral') {
          // Comentário: envia o campo de pesquisa geral alinhado com a API atual.
          params.append('pesquisaGeral', normalized);
          return;
        }
        params.append(key, normalized);
      }
    });

    return params;
  };

  // Utilitários de normalização para filtros textuais e numéricos.
  const norm = (value) => String(value || '').toLowerCase().trim();
  const onlyDigits = (value) => String(value || '').replace(/\D+/g, '');

  // Valida se um termo está presente em alguma liderança.
  const matchLiderancas = (liderancas, termo) => {
    if (!termo) return true;
    if (!Array.isArray(liderancas)) return false;
    const termoDigits = onlyDigits(termo);
    const termoLower = norm(termo);
    return liderancas.some((lideranca) => {
      if (typeof lideranca === 'string') {
        return norm(lideranca).includes(termoLower);
      }
      if (lideranca && typeof lideranca === 'object') {
        const nome = norm(lideranca.nome);
        const cpf = onlyDigits(lideranca.cpf);
        return nome.includes(termoLower) || (termoDigits && cpf.includes(termoDigits));
      }
      return false;
    });
  };

  // Valida se o termo geral bate com endereços cadastrados.
  const matchEnderecos = (enderecos, termo) => {
    if (!termo) return true;
    if (!Array.isArray(enderecos)) return false;
    const termoLower = norm(termo);
    const termoDigits = onlyDigits(termo);
    return enderecos.some((endereco) => {
      const uf = norm(endereco.uf);
      const logradouro = norm(endereco.logradouro);
      const bairro = norm(endereco.bairro);
      const cidade = norm(endereco.cidade);
      const complemento = norm(endereco.complemento);
      const cep = onlyDigits(endereco.cep);
      return (
        uf.includes(termoLower) ||
        logradouro.includes(termoLower) ||
        bairro.includes(termoLower) ||
        cidade.includes(termoLower) ||
        complemento.includes(termoLower) ||
        (termoDigits && cep.includes(termoDigits))
      );
    });
  };

  // Valida se o termo geral bate com veículos vinculados.
  const matchVeiculos = (veiculos, termo) => {
    if (!termo) return true;
    if (!Array.isArray(veiculos)) return false;
    const termoLower = norm(termo);
    const termoDigits = onlyDigits(termo);
    return veiculos.some((veiculo) => {
      const placa = norm(veiculo.placa);
      const marcaModelo = norm(veiculo.marcaModelo);
      const cor = norm(veiculo.cor);
      const nomeProprietario = norm(veiculo.nomeProprietario);
      const cnpj = onlyDigits(veiculo.cnpj);
      const anoModelo = String(veiculo.anoModelo || '').toLowerCase();
      return (
        placa.includes(termoLower) ||
        marcaModelo.includes(termoLower) ||
        cor.includes(termoLower) ||
        nomeProprietario.includes(termoLower) ||
        (!!anoModelo && anoModelo.includes(termoLower)) ||
        (termoDigits && cnpj.includes(termoDigits))
      );
    });
  };

  // Aplica filtros adicionais do front para endereços, veículos e pesquisa geral.
  const filtrarResultados = (entidades, filtros) => {
    if (!Array.isArray(entidades)) return [];

    const nomeFiltro = norm(filtros.nome);
    const liderFiltro = norm(filtros.lider);
    const telefoneFiltro = onlyDigits(filtros.telefone);
    const cnpjFiltro = onlyDigits(filtros.cnpj);
    const enderecoFiltro = norm(filtros.endereco);
    const veiculosFiltro = norm(filtros.veiculos);
    const pesquisaGeral = norm(filtros.pesquisaGeral);

    return entidades.filter((entidade) => {
      const nomeOk = nomeFiltro ? norm(entidade.nome).includes(nomeFiltro) : true;
      const cnpjOk = cnpjFiltro ? onlyDigits(entidade.cnpj).includes(cnpjFiltro) : true;
      const liderOk = liderFiltro ? matchLiderancas(entidade.liderancas, liderFiltro) : true;
      const telefoneOk = telefoneFiltro
        ? (entidade.telefones || []).some((t) => onlyDigits(t.numero).includes(telefoneFiltro))
        : true;
      const enderecoOk = enderecoFiltro ? matchEnderecos(entidade.enderecos, enderecoFiltro) : true;
      const veiculosOk = veiculosFiltro ? matchVeiculos(entidade.veiculos, veiculosFiltro) : true;

      if (!nomeOk || !cnpjOk || !liderOk || !telefoneOk || !enderecoOk || !veiculosOk) {
        return false;
      }

      if (!pesquisaGeral) return true;

      // Comentário: pesquisa geral amplia a busca por outros campos da entidade.
      const descricao = norm(entidade.descricao);
      const obs = norm(entidade.obs);
      const telefoneMatch = (entidade.telefones || []).some((t) => onlyDigits(t.numero).includes(onlyDigits(pesquisaGeral)));
      const nomeMatch = norm(entidade.nome).includes(pesquisaGeral);
      const cnpjMatch = onlyDigits(entidade.cnpj).includes(onlyDigits(pesquisaGeral));
      const liderMatch = matchLiderancas(entidade.liderancas, pesquisaGeral);
      const enderecoMatch = matchEnderecos(entidade.enderecos, pesquisaGeral);
      const veiculosMatch = matchVeiculos(entidade.veiculos, pesquisaGeral);

      return (
        nomeMatch ||
        cnpjMatch ||
        liderMatch ||
        telefoneMatch ||
        descricao.includes(pesquisaGeral) ||
        obs.includes(pesquisaGeral) ||
        enderecoMatch ||
        veiculosMatch
      );
    });
  };

  // Constrói célula de tabela com fallback de valor e classe opcional.
  const createCell = (text, className = '') => {
    const cell = document.createElement('td');
    cell.textContent = text || '—';
    if (className) cell.className = className;
    return cell;
  };

  // Concatena lideranças para exibição do nome e CPF quando disponíveis.
  const formatLiderancas = (liderancas) => {
    if (!Array.isArray(liderancas) || liderancas.length === 0) return '—';
    return liderancas
      .map((lideranca) => {
        if (typeof lideranca === 'string') return lideranca;
        const nome = lideranca.nome || 'Liderança sem nome';
        const cpf = lideranca.cpf ? ` (CPF: ${lideranca.cpf})` : '';
        return `${nome}${cpf}`;
      })
      .join(' | ');
  };

  // Formata telefones no formato legível por lista.
  const formatTelefones = (telefones) => {
    if (!Array.isArray(telefones) || telefones.length === 0) return '—';
    return telefones.map((t) => t.numero).filter(Boolean).join(' | ') || '—';
  };

  // Formata endereços com UF, logradouro e bairro.
  const formatEnderecos = (enderecos) => {
    if (!Array.isArray(enderecos) || enderecos.length === 0) return '—';
    return enderecos.map((endereco) => {
      const partes = [endereco.uf, endereco.cidade, endereco.logradouro, endereco.bairro].filter(Boolean).join(', ');
      const cep = endereco.cep ? ` CEP: ${endereco.cep}` : '';
      return `${partes}${cep}`.trim() || '—';
    }).join(' | ');
  };

  // Formata veículos destacando placas ou modelo quando disponível.
  const formatVeiculos = (veiculos) => {
    if (!Array.isArray(veiculos) || veiculos.length === 0) return '—';
    const descricoes = veiculos.map((veiculo) => {
      const placa = veiculo.placa ? `Placa: ${veiculo.placa}` : '';
      const modelo = veiculo.marcaModelo ? `Modelo: ${veiculo.marcaModelo}` : '';
      const cor = veiculo.cor ? `Cor: ${veiculo.cor}` : '';
      return [placa, modelo, cor].filter(Boolean).join(' | ');
    }).filter(Boolean);
    return descricoes.length ? descricoes.join(' • ') : '—';
  };

  // Renderiza os resultados em uma tabela simples com as informações principais.
  const renderResults = (entidades) => {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    if (!Array.isArray(entidades) || entidades.length === 0) {
      // Mensagem neutra para ausência de dados, aplicável a filtros específicos ou pesquisa geral.
      setMessage('Nenhum resultado encontrado para os filtros informados.', 'info');
      return;
    }

    const table = document.createElement('table');
    table.className = 'table table--results';

    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Nome', 'CNPJ', 'Lideranças', 'Telefones', 'Endereços', 'Veículos', 'Ações'].forEach((heading) => {
      const th = document.createElement('th');
      th.textContent = heading;
      if (heading === 'Ações') th.style.textAlign = 'center';
      headerRow.appendChild(th);
    });
    header.appendChild(headerRow);
    table.appendChild(header);

    const body = document.createElement('tbody');

    entidades.forEach((entidade) => {
      const row = document.createElement('tr');

      row.appendChild(createCell(entidade.nome || 'Entidade sem nome'));
      row.appendChild(createCell(entidade.cnpj));
      row.appendChild(createCell(formatLiderancas(entidade.liderancas)));
      row.appendChild(createCell(formatTelefones(entidade.telefones)));
      row.appendChild(createCell(formatEnderecos(entidade.enderecos)));
      row.appendChild(createCell(formatVeiculos(entidade.veiculos)));

      // Coluna de ações: abrir cadastro da entidade em nova aba.
      const actionsCell = document.createElement('td');
      actionsCell.className = 'table__actions';
      actionsCell.style.textAlign = 'center';
      const entidadeId = entidade.id || entidade._id || '';
      if (entidadeId) {
        const openLink = document.createElement('a');
        openLink.textContent = 'Abrir';
        openLink.href = `/cadastro/entidades?entidadeId=${encodeURIComponent(entidadeId)}`;
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

    const endpoint = queryString ? `/api/entidades?${queryString}` : '/api/entidades';

    setMessage('Consultando entidades, por favor aguarde...', 'info');
    clearResults('Carregando resultados...');

    try {
      const response = await authorizedFetch(endpoint, { method: 'GET' });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        const errorMessage = data?.message || 'Não foi possível concluir a consulta de entidades.';
        setMessage(errorMessage, 'error');
        return;
      }

      const filtros = {
        nome: formData.get('nome'),
        cnpj: formData.get('cnpj'),
        lider: formData.get('lider'),
        telefone: formData.get('telefone'),
        endereco: formData.get('endereco'),
        veiculos: formData.get('veiculos'),
        pesquisaGeral: formData.get('pesquisaGeral'),
      };

      const lista = Array.isArray(data) ? data : (data?.data || []);
      const filtradas = filtrarResultados(lista, filtros);
      renderResults(filtradas);

      if (filtros.pesquisaGeral) {
        setMessage(`Exibindo ${filtradas.length} resultado(s) para "${filtros.pesquisaGeral}".`, 'success');
      }
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
