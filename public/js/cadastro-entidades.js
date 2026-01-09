(function () {
  const API_ENTIDADES = '/api/entidades';

  // Referências do formulário
  const form = document.getElementById('entidade-form');
  const formMsgEl = document.getElementById('entidade-form-message');
  const listaMsgEl = document.getElementById('entidades-message');
  const listaEl = document.getElementById('entidades-lista');
  const filtroEl = document.getElementById('campo-consulta-entidades');
  const submitBtn = document.getElementById('submit-entidade');
  const listarBtn = document.getElementById('listar-entidades');
  const limparBtn = document.getElementById('limpar-form');

  const liderancasContainer = document.getElementById('lista-liderancas');
  const telefonesContainer = document.getElementById('lista-telefones');
  const enderecosContainer = document.getElementById('lista-enderecos');
  const fotosAtuaisContainer = document.getElementById('fotos-atuais');
  const fotosInput = document.getElementById('entidade-fotos');
  const abrirSeletorFotosBtn = document.getElementById('abrir-seletor-fotos');

  // Estado local em memória para simplificar renderizações
  const estado = {
    entidades: [],
    filtro: '',
    emEdicao: null,
    liderancas: [],
    telefones: [],
    enderecos: [],
    indicadorEnderecoAtual: null,
    fotosAtuais: [],
    fotosParaRemover: [],
  };

  // Helpers de autenticação reciclados de outras páginas
  const getCookie = (name) => document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))?.split('=')[1];
  const obterToken = () => localStorage.getItem('authToken') || getCookie('authToken');
  const fetchAutenticado = (url, options = {}) => {
    const token = obterToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    return fetch(url, { ...options, headers });
  };

  // Mensagens de feedback reutilizáveis
  const exibirMensagem = (el, texto, tipo = 'info') => {
    if (!el) return;
    el.textContent = texto || '';
    el.className = 'message';
    if (texto) el.classList.add(`message--${tipo}`);
  };

  // Máscaras simples para manter a consistência visual
  const aplicarMascaraCnpj = (valor) => {
    const dig = String(valor || '').replace(/\D/g, '').slice(0, 14);
    if (dig.length <= 2) return dig;
    const p1 = dig.slice(0, 2);
    const p2 = dig.slice(2, 5);
    const p3 = dig.slice(5, 8);
    const p4 = dig.slice(8, 12);
    const p5 = dig.slice(12);
    return `${p1}.${p2}${p3 ? `.${p3}` : ''}${p4 ? `/${p4}` : ''}${p5 ? `-${p5}` : ''}`;
  };

  const aplicarMascaraTelefone = (valor) => {
    const dig = String(valor || '').replace(/\D/g, '').slice(0, 11);
    if (dig.length <= 10) {
      return dig.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => {
        let r = '';
        if (a) r += `(${a})`;
        if (b) r += ` ${b}${c ? '-' : ''}`;
        if (c) r += c;
        return r.trim();
      });
    }
    return dig.replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_, a, b, c) => {
      let r = '';
      if (a) r += `(${a})`;
      if (b) r += ` ${b}${c ? '-' : ''}`;
      if (c) r += c;
      return r.trim();
    });
  };

  const aplicarMascaraCep = (valor) => {
    const dig = String(valor || '').replace(/\D/g, '').slice(0, 8);
    return dig.length > 5 ? `${dig.slice(0, 5)}-${dig.slice(5)}` : dig;
  };

  // Construção de campos dinâmicos -----------------------------
  const renderizarLiderancas = () => {
    liderancasContainer.innerHTML = '';
    estado.liderancas.forEach((nome, index) => {
      // Container da liderança com barra superior e campos abaixo
      const bloco = document.createElement('div');
      bloco.style.cssText = 'border: 1px solid var(--border); border-radius: 0.5rem; padding: 0.75rem;';

      // Barra superior: botão de remover acima dos campos
      const topBar = document.createElement('div');
      topBar.style.cssText = 'display:flex; justify-content:flex-end; margin-bottom:0.5rem;';
      const btnTopo = document.createElement('button');
      btnTopo.className = 'button button--danger';
      btnTopo.type = 'button';
      btnTopo.textContent = '−';
      btnTopo.title = 'Excluir';
      btnTopo.setAttribute('aria-label', 'Remover liderança');
      btnTopo.setAttribute('data-remover-lideranca', String(index));
      topBar.appendChild(btnTopo);
      bloco.appendChild(topBar);

      // Grid com o único campo de nome da liderança
      const grid = document.createElement('div');
      grid.className = 'form__grid form__grid--1';
      grid.innerHTML = `
        <label class="form__field" style="margin:0;">
          <span class="form__label">Nome da liderança</span>
          <input class="form__input" type="text" value="${nome || ''}" data-lideranca-index="${index}" />
        </label>
      `;
      bloco.appendChild(grid);

      const input = bloco.querySelector('input[data-lideranca-index]');
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-lideranca-index'));
        estado.liderancas[idx] = e.target.value;
      });
      liderancasContainer.appendChild(bloco);
    });
  };

  const renderizarTelefones = () => {
    telefonesContainer.innerHTML = '';

    if (estado.telefones.length === 0) {
      // Não exibe placeholder quando não há telefones
      return;
    }

    estado.telefones.forEach((telefone, indice) => {
      const divTelefone = document.createElement('div');
      divTelefone.style.display = 'flex';
      divTelefone.style.gap = '0.5rem';
      divTelefone.style.alignItems = 'center';

      const inputTelefone = document.createElement('input');
      inputTelefone.type = 'tel';
      inputTelefone.className = 'form__input';
      inputTelefone.inputMode = 'numeric';
      try { inputTelefone.setAttribute('maxlength', '16'); } catch {}
      inputTelefone.value = telefone || '';
      inputTelefone.placeholder = '(XX) XXXXX-XXXX';
      inputTelefone.addEventListener('input', (e) => {
        e.target.value = aplicarMascaraTelefone(e.target.value);
        estado.telefones[indice] = e.target.value;
      });
      divTelefone.appendChild(inputTelefone);

      const btnRemover = document.createElement('button');
      btnRemover.type = 'button';
      btnRemover.className = 'button button--danger';
      btnRemover.textContent = '−';
      btnRemover.setAttribute('aria-label', 'Remover telefone');
      btnRemover.title = 'Excluir';
      btnRemover.style.padding = '0.25rem 0.5rem';
      btnRemover.style.fontSize = '0.75rem';
      btnRemover.style.minWidth = 'fit-content';
      btnRemover.addEventListener('click', () => {
        estado.telefones.splice(indice, 1);
        renderizarTelefones();
      });
      divTelefone.appendChild(btnRemover);

      telefonesContainer.appendChild(divTelefone);
    });
  };

  // ===== Endereços (mesmos campos e lógica da página Pessoas) =====
  const createEstadosSelect = () => {
    return `<option value="">Selecione</option>
                    <option value="AC">Acre (AC)</option>
                    <option value="AL">Alagoas (AL)</option>
                    <option value="AP">Amapá (AP)</option>
                    <option value="AM">Amazonas (AM)</option>
                    <option value="BA">Bahia (BA)</option>
                    <option value="CE">Ceará (CE)</option>
                    <option value="DF">Distrito Federal (DF)</option>
                    <option value="ES">Espírito Santo (ES)</option>
                    <option value="GO">Goiás (GO)</option>
                    <option value="MA">Maranhão (MA)</option>
                    <option value="MT">Mato Grosso (MT)</option>
                    <option value="MS">Mato Grosso do Sul (MS)</option>
                    <option value="MG">Minas Gerais (MG)</option>
                    <option value="PA">Pará (PA)</option>
                    <option value="PB">Paraíba (PB)</option>
                    <option value="PR">Paraná (PR)</option>
                    <option value="PE">Pernambuco (PE)</option>
                    <option value="PI">Piauí (PI)</option>
                    <option value="RJ">Rio de Janeiro (RJ)</option>
                    <option value="RN">Rio Grande do Norte (RN)</option>
                    <option value="RS">Rio Grande do Sul (RS)</option>
                    <option value="RO">Rondônia (RO)</option>
                    <option value="RR">Roraima (RR)</option>
                    <option value="SC">Santa Catarina (SC)</option>
                    <option value="SP">São Paulo (SP)</option>
                    <option value="SE">Sergipe (SE)</option>
                    <option value="TO">Tocantins (TO)</option>`;
  };

  const gerarLinkMapaLatLong = (valorLatLong) => {
    const texto = String(valorLatLong || '').trim();
    const coordenadas = texto.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!coordenadas) return '';
    return `https://www.google.com/maps?q=${coordenadas[1]},${coordenadas[2]}`;
  };

  const gerarLinkMapaEndereco = (endereco) => {
    if (!endereco) return '';
    const partes = [endereco.logradouro, endereco.bairro, endereco.complemento, endereco.uf, endereco.cep]
      .filter(Boolean).map(String);
    if (!partes.length) return '';
    const query = encodeURIComponent(partes.join(', '));
    return `https://www.google.com/maps?q=${query}`;
  };

  const mostrarCarregamentoCep = (index, mostrando) => {
    const statusEl = document.querySelector(`.cep-status-${index}`);
    if (!statusEl) return;
    if (mostrando) {
      statusEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--primary);">
          <div class="spinner" style="width: 16px; height: 16px; border: 2px solid var(--primary); border-top: 2px solid transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
          <span>Carregando endereço...</span>
        </div>
      `;
      statusEl.style.display = 'block';
    } else {
      statusEl.style.display = 'none';
    }
  };

  const exibirStatusCep = (index, mensagem, tipo) => {
    const statusEl = document.querySelector(`.cep-status-${index}`);
    if (!statusEl) return;
    const cores = { success: 'var(--success-text)', error: 'var(--error-text)' };
    statusEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; color: ${cores[tipo] || 'var(--text)'};">
        <span>${tipo === 'success' ? '✓' : '✕'}</span>
        <span>${mensagem}</span>
      </div>
    `;
    statusEl.style.display = 'block';
    setTimeout(() => { if (statusEl.style.display !== 'none') statusEl.style.display = 'none'; }, 3000);
  };

  const buscarEnderecoPorCepMultiplo = async (cep, index) => {
    const somenteNumeros = String(cep || '').replace(/\D/g, '');
    if (somenteNumeros.length !== 8) { mostrarCarregamentoCep(index, false); return; }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${somenteNumeros}/json/`);
      const data = await response.json();
      if (data.erro) {
        exibirStatusCep(index, 'CEP não encontrado', 'error');
      } else {
        estado.enderecos[index].uf = data.uf || '';
        estado.enderecos[index].logradouro = data.logradouro || '';
        estado.enderecos[index].bairro = `${data.bairro || ''} ${data.localidade || ''}`.trim();
        estado.enderecos[index].cep = somenteNumeros;
        renderizarEnderecos();
        exibirStatusCep(index, 'Endereço carregado com sucesso', 'success');
      }
    } catch (error) {
      exibirStatusCep(index, 'Erro ao buscar CEP', 'error');
    } finally {
      mostrarCarregamentoCep(index, false);
    }
  };

  const renderizarEnderecos = () => {
    enderecosContainer.innerHTML = '';

    if (estado.enderecos.length === 0) {
      // Não exibe placeholder quando não há endereços
      return;
    }

    const ordemEnderecos = estado.indicadorEnderecoAtual === null
      ? estado.enderecos.map((_, indice) => indice)
      : [estado.indicadorEnderecoAtual, ...estado.enderecos.map((_, i) => i).filter((i) => i !== estado.indicadorEnderecoAtual)];

    ordemEnderecos.forEach((indiceOrdenado, posicao) => {
      const endereco = estado.enderecos[indiceOrdenado];
      const div = document.createElement('div');
      div.className = 'endereco-item';
      div.style.cssText = 'border: 1px solid var(--border); border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem; background: var(--surface-muted);';

      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;';
      const titleSpan = document.createElement('span');
      titleSpan.style.cssText = 'font-weight: 600; color: var(--text);';
      titleSpan.textContent = `Endereço ${posicao + 1}${estado.indicadorEnderecoAtual === indiceOrdenado ? ' (Atual)' : ''}`;
      const actionsDiv = document.createElement('div');
      actionsDiv.style.cssText = 'display: flex; gap: 0.5rem;';
      if (estado.enderecos.length > 1 && estado.indicadorEnderecoAtual !== indiceOrdenado) {
        const setarAtualBtn = document.createElement('button');
        setarAtualBtn.type = 'button';
        setarAtualBtn.className = 'button button--secondary';
        setarAtualBtn.textContent = 'Definir como Atual';
        setarAtualBtn.addEventListener('click', () => { estado.indicadorEnderecoAtual = indiceOrdenado; renderizarEnderecos(); });
        actionsDiv.appendChild(setarAtualBtn);
      }
      const removerBtn = document.createElement('button');
      removerBtn.type = 'button';
      removerBtn.className = 'button button--danger';
      removerBtn.textContent = '−';
      removerBtn.setAttribute('aria-label', 'Remover endereço');
      removerBtn.title = 'Excluir';
      removerBtn.style.cssText = 'padding: 0.25rem 0.5rem; font-size: 0.75rem; min-width: fit-content;';
      removerBtn.addEventListener('click', () => {
        estado.enderecos.splice(indiceOrdenado, 1);
        if (estado.indicadorEnderecoAtual === indiceOrdenado) {
          estado.indicadorEnderecoAtual = estado.enderecos.length > 0 ? 0 : null;
        } else if (estado.indicadorEnderecoAtual > indiceOrdenado) {
          estado.indicadorEnderecoAtual--;
        }
        renderizarEnderecos();
      });
      actionsDiv.appendChild(removerBtn);
      headerDiv.appendChild(titleSpan);
      headerDiv.appendChild(actionsDiv);
      div.appendChild(headerDiv);

      const gridDiv = document.createElement('div');
      gridDiv.className = 'form__grid form__grid--4';
      gridDiv.innerHTML = `
        <label class="form__field">
          <span class="form__label">UF</span>
          <select class="form__input endereco-uf" data-index="${indiceOrdenado}">${createEstadosSelect()}</select>
        </label>
        <label class="form__field form__field--wide" style="position: relative;">
          <span class="form__label">Logradouro/Nome</span>
          <input class="form__input endereco-logradouro" type="text" data-index="${indiceOrdenado}" />
        </label>
        <label class="form__field">
          <span class="form__label">Bairro/Cidade</span>
          <input class="form__input endereco-bairro" type="text" data-index="${indiceOrdenado}" />
        </label>
        <label class="form__field">
          <span class="form__label">CEP</span>
          <input class="form__input endereco-cep" type="text" inputmode="numeric" data-index="${indiceOrdenado}" />
        </label>
        <label class="form__field">
          <span class="form__label">Complemento</span>
          <input class="form__input endereco-complemento" type="text" data-index="${indiceOrdenado}" />
        </label>
        <label class="form__field form__field--wide" style="position: relative;">
          <span class="form__label">Lat/Long</span>
          <input class="form__input endereco-latlong" type="text" data-index="${indiceOrdenado}" placeholder="-23.5, -46.6" />
        </label>`;

      gridDiv.querySelector('.endereco-uf').value = endereco.uf || '';
      gridDiv.querySelector('.endereco-logradouro').value = endereco.logradouro || '';
      gridDiv.querySelector('.endereco-bairro').value = endereco.bairro || '';
      gridDiv.querySelector('.endereco-cep').value = endereco.cep || '';
      gridDiv.querySelector('.endereco-complemento').value = endereco.complemento || '';
      gridDiv.querySelector('.endereco-latlong').value = endereco.latLong || '';

      gridDiv.querySelector('.endereco-uf').addEventListener('change', (e) => { estado.enderecos[indiceOrdenado].uf = e.target.value; });
      gridDiv.querySelector('.endereco-logradouro').addEventListener('input', (e) => { estado.enderecos[indiceOrdenado].logradouro = e.target.value; });
      gridDiv.querySelector('.endereco-bairro').addEventListener('input', (e) => { estado.enderecos[indiceOrdenado].bairro = e.target.value; });
      gridDiv.querySelector('.endereco-complemento').addEventListener('input', (e) => { estado.enderecos[indiceOrdenado].complemento = e.target.value; });

      // Link inline para Logradouro
      const logradouroCampo = gridDiv.querySelector('.endereco-logradouro');
      const logradouroField = logradouroCampo.closest('.form__field');
      const logradouroAnchor = document.createElement('a');
      logradouroAnchor.className = 'endereco-inline-link';
      logradouroAnchor.style.cssText = 'position:absolute; inset: calc(1.6rem + 2px) 2px 2px 2px; display:none; align-items:center; padding: 0.5rem 0.75rem; border-radius: 0.4rem; text-decoration: underline; color: var(--primary); background: transparent; z-index: 2; pointer-events: auto;';
      logradouroAnchor.target = '_blank';
      logradouroAnchor.rel = 'noopener noreferrer';
      logradouroField?.appendChild(logradouroAnchor);
      const atualizarLinkEnderecoTexto = () => {
        if (!estado.enderecos[indiceOrdenado]?.mostrarLinkEndereco) {
          logradouroAnchor.style.display = 'none';
          logradouroCampo.style.color = '';
          logradouroCampo.style.textShadow = '';
          logradouroCampo.style.caretColor = '';
          logradouroCampo.style.pointerEvents = '';
          return;
        }
        const url = gerarLinkMapaEndereco(estado.enderecos[indiceOrdenado]);
        const texto = String(estado.enderecos[indiceOrdenado]?.logradouro || '').trim();
        if (url && texto) {
          logradouroAnchor.href = url;
          logradouroAnchor.textContent = texto;
          logradouroAnchor.title = 'Abrir endereço no Google Maps';
          logradouroAnchor.style.display = 'flex';
          logradouroCampo.style.color = 'transparent';
          logradouroCampo.style.textShadow = 'none';
          logradouroCampo.style.caretColor = 'var(--text)';
          logradouroCampo.style.pointerEvents = 'none';
        } else {
          logradouroAnchor.style.display = 'none';
          logradouroCampo.style.color = '';
          logradouroCampo.style.textShadow = '';
          logradouroCampo.style.caretColor = '';
          logradouroCampo.style.pointerEvents = '';
        }
      };
      atualizarLinkEnderecoTexto();
      logradouroCampo.addEventListener('input', () => { estado.enderecos[indiceOrdenado].mostrarLinkEndereco = false; atualizarLinkEnderecoTexto(); });

      // Link/editar para Lat/Long
      const latLongCampo = gridDiv.querySelector('.endereco-latlong');
      const latLongField = latLongCampo.closest('.form__field');
      const latLongAnchor = document.createElement('a');
      latLongAnchor.className = 'latlong-inline-link';
      latLongAnchor.style.cssText = 'display:none; margin-top: 0.35rem; text-decoration: underline; color: var(--primary);';
      latLongAnchor.target = '_blank';
      latLongAnchor.rel = 'noopener noreferrer';
      const latLongEditBtn = document.createElement('button');
      latLongEditBtn.type = 'button';
      latLongEditBtn.className = 'button button--secondary';
      latLongEditBtn.textContent = 'Editar';
      latLongEditBtn.title = 'Editar Lat/Long';
      latLongEditBtn.style.cssText = 'display:none; margin-top: 0.35rem; padding: 0.25rem 0.5rem; font-size: 0.75rem;';
      const latLongActionsWrap = document.createElement('div');
      latLongActionsWrap.style.cssText = 'display:flex; gap:0.5rem; align-items:center;';
      latLongActionsWrap.appendChild(latLongAnchor);
      latLongActionsWrap.appendChild(latLongEditBtn);
      latLongField?.appendChild(latLongActionsWrap);
      const atualizarLinkLatLong = (valor) => {
        const texto = String(valor || '').trim();
        const url = gerarLinkMapaLatLong(texto);
        const podeMostrar = Boolean(estado.enderecos[indiceOrdenado]?.mostrarLinkLatLong);
        if (url && texto && podeMostrar) {
          latLongAnchor.href = url;
          latLongAnchor.textContent = texto;
          latLongAnchor.title = 'Abrir no Google Maps';
          latLongAnchor.style.display = 'inline';
          latLongEditBtn.style.display = 'inline';
          latLongCampo.style.display = 'none';
        } else {
          latLongAnchor.style.display = 'none';
          latLongEditBtn.style.display = 'none';
          latLongCampo.style.display = '';
        }
      };
      atualizarLinkLatLong(latLongCampo.value);
      latLongCampo.addEventListener('input', (e) => {
        estado.enderecos[indiceOrdenado].latLong = e.target.value;
        estado.enderecos[indiceOrdenado].mostrarLinkLatLong = false;
        atualizarLinkLatLong(e.target.value);
      });
      latLongEditBtn.addEventListener('click', () => {
        estado.enderecos[indiceOrdenado].mostrarLinkLatLong = false;
        atualizarLinkLatLong(latLongCampo.value);
        latLongCampo.focus();
      });

      const cepInput = gridDiv.querySelector('.endereco-cep');
      cepInput.addEventListener('input', (e) => { e.target.value = aplicarMascaraCep(e.target.value); });
      cepInput.addEventListener('blur', (e) => {
        if (e.target.value?.trim()) { mostrarCarregamentoCep(indiceOrdenado, true); buscarEnderecoPorCepMultiplo(e.target.value, indiceOrdenado); }
      });

      div.appendChild(gridDiv);
      const statusDiv = document.createElement('div');
      statusDiv.className = `cep-status-${indiceOrdenado}`;
      statusDiv.style.cssText = 'margin-top: 0.75rem; font-size: 0.85rem; display: none;';
      div.appendChild(statusDiv);
      enderecosContainer.appendChild(div);
    });
  };

  // Fotos atuais com opção de remoção
  const renderizarFotosAtuais = () => {
    fotosAtuaisContainer.innerHTML = '';
    const emptyMsgEl = document.getElementById('fotos-empty-message');
    if (!estado.fotosAtuais.length) {
      if (emptyMsgEl) emptyMsgEl.style.display = 'block';
      return;
    }
    if (emptyMsgEl) emptyMsgEl.style.display = 'none';
    estado.fotosAtuais.forEach((foto) => {
      const card = document.createElement('div');
      card.className = 'card card--subtle';
      card.style.padding = '0.5rem';
      card.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.35rem; align-items:flex-start;">
          ${foto.url ? `<img src="${foto.url}" alt="Foto da entidade" style="width:100%; height:120px; object-fit:cover; border-radius:8px;" />` : ''}
          <span style="font-size: 0.9rem;">${foto.nomeArquivo || 'Foto'}</span>
          <div style="display:flex; gap:0.5rem; align-self:flex-end;">
            ${foto.url ? `<button class="button button--ghost" type="button" data-abrir-foto-url="${foto.url}" title="Abrir" aria-label="Abrir foto" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; min-width: fit-content;">Abrir</button>` : ''}
            <button class="button button--ghost" type="button" data-remover-foto="${foto.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; min-width: fit-content;">Remover</button>
          </div>
        </div>
      `;
      fotosAtuaisContainer.appendChild(card);
    });
  };

  // Adição de novos itens nas listas
  document.getElementById('adicionar-lideranca')?.addEventListener('click', () => {
    estado.liderancas.push('');
    renderizarLiderancas();
  });

  document.getElementById('adicionar-telefone')?.addEventListener('click', () => {
    estado.telefones.push('');
    renderizarTelefones();
  });

  document.getElementById('adicionar-endereco')?.addEventListener('click', () => {
    estado.enderecos.push({ uf: '', logradouro: '', bairro: '', cep: '', complemento: '', latLong: '' });
    if (estado.indicadorEnderecoAtual === null && estado.enderecos.length === 1) {
      estado.indicadorEnderecoAtual = 0;
    }
    renderizarEnderecos();
  });

  // Listeners delegados para remoções
  liderancasContainer.addEventListener('click', (e) => {
    const idx = e.target.getAttribute('data-remover-lideranca');
    if (idx !== null) {
      estado.liderancas.splice(Number(idx), 1);
      renderizarLiderancas();
    }
  });

  telefonesContainer.addEventListener('click', (e) => {
    const idx = e.target.getAttribute('data-remover-telefone');
    if (idx !== null) {
      estado.telefones.splice(Number(idx), 1);
      renderizarTelefones();
    }
  });

  enderecosContainer.addEventListener('click', (e) => {
    const idx = e.target.getAttribute('data-remover-endereco');
    if (idx !== null) {
      estado.enderecos.splice(Number(idx), 1);
      renderizarEnderecos();
    }
  });

  fotosAtuaisContainer.addEventListener('click', (e) => {
    const abrirUrl = e.target.getAttribute('data-abrir-foto-url');
    if (abrirUrl) {
      try { window.open(abrirUrl, '_blank', 'noopener'); } catch {}
      return;
    }
    const fotoId = e.target.getAttribute('data-remover-foto');
    if (fotoId) {
      estado.fotosParaRemover.push(fotoId);
      estado.fotosAtuais = estado.fotosAtuais.filter((f) => f.id !== fotoId);
      renderizarFotosAtuais();
    }
  });

  // Botão customizado para abrir o seletor de arquivos (remove texto nativo "Nenhum arquivo escolhido")
  abrirSeletorFotosBtn?.addEventListener('click', () => {
    fotosInput?.click();
  });

  // Limita CNPJ a no máximo 14 dígitos e aplica máscara durante a digitação
  (function initCnpjMask() {
    const cnpjInput = document.getElementById('entidade-cnpj');
    if (!cnpjInput) return;
    // Limite visual total (com máscara) é 18 caracteres: 00.000.000/0000-00
    try { cnpjInput.setAttribute('maxlength', '18'); } catch {}
    cnpjInput.addEventListener('input', (e) => {
      const mascarado = aplicarMascaraCnpj(e.target.value || '');
      e.target.value = mascarado;
    });
  })();

  // Coleta de dados do formulário e envio para API
  const coletarDadosFormulario = () => {
    const dados = new FormData();
    dados.append('nome', document.getElementById('entidade-nome')?.value.trim() || '');
    dados.append('cnpj', aplicarMascaraCnpj(document.getElementById('entidade-cnpj')?.value));
    dados.append('descricao', document.getElementById('entidade-descricao')?.value.trim() || '');
    dados.append('liderancas', JSON.stringify(estado.liderancas.map((l) => (l || '').trim()).filter(Boolean)));
    dados.append('telefones', JSON.stringify(estado.telefones.map((t) => t || '').filter(Boolean)));
    dados.append('enderecos', JSON.stringify(estado.enderecos));
    dados.append('endereco_atual_index', estado.indicadorEnderecoAtual === null ? '' : String(estado.indicadorEnderecoAtual));
    dados.append('fotosParaRemover', JSON.stringify(estado.fotosParaRemover));

    const arquivos = fotosInput?.files ? Array.from(fotosInput.files) : [];
    arquivos.forEach((file) => dados.append('fotos', file));
    return dados;
  };

  const limparFormulario = () => {
    form?.reset();
    estado.emEdicao = null;
    estado.liderancas = [];
    estado.telefones = [];
    estado.enderecos = [];
    estado.indicadorEnderecoAtual = null;
    estado.fotosAtuais = [];
    estado.fotosParaRemover = [];
    submitBtn.textContent = 'Incluir';
    exibirMensagem(formMsgEl, '');
    renderizarLiderancas();
    renderizarTelefones();
    renderizarEnderecos();
    renderizarFotosAtuais();
  };

  limparBtn?.addEventListener('click', () => limparFormulario());

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    exibirMensagem(formMsgEl, 'Salvando entidade...', 'info');
    submitBtn.disabled = true;

    const corpo = coletarDadosFormulario();
    const url = estado.emEdicao ? `${API_ENTIDADES}/${estado.emEdicao}` : API_ENTIDADES;
    const method = estado.emEdicao ? 'PUT' : 'POST';

    try {
      const resposta = await fetchAutenticado(url, { method, body: corpo });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados?.message || 'Falha ao salvar entidade');
      // Popup conforme solicitado
      if (!estado.emEdicao) {
        alert('Entidade cadastrada com sucesso!');
      } else {
        alert('Alterações realizadas com sucesso!');
      }
      // Limpa mensagem do formulário após sucesso
      exibirMensagem(formMsgEl, '');
      limparFormulario();
      await carregarEntidades();
    } catch (error) {
      exibirMensagem(formMsgEl, error.message || 'Erro ao salvar entidade', 'error');
    } finally {
      submitBtn.disabled = false;
      fotosInput.value = '';
    }
  });

  // Renderiza tabela com Nome, Liderança, CNPJ, limitando aos 10 últimos
  const renderizarLista = () => {
    listaEl.innerHTML = '';
    const termo = (estado.filtro || '').toLowerCase();
    const filtradas = estado.entidades.filter((ent) => {
      const nomeOk = String(ent.nome || '').toLowerCase().includes(termo);
      const cnpjOk = String(aplicarMascaraCnpj(ent.cnpj || '')).toLowerCase().includes(termo);
      const telefoneOk = (ent.telefones || []).some((t) => String(aplicarMascaraTelefone(t.numero || t || '')).toLowerCase().includes(termo));
      return !termo || nomeOk || cnpjOk || telefoneOk;
    });

    const ultimos = filtradas.slice(0, 10);

    if (!ultimos.length) {
      listaEl.innerHTML = '<p class="muted">Nenhuma entidade encontrada.</p>';
      return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
      <thead>
        <tr style="background: var(--surface-muted);">
          <th style="text-align:left; padding:0.5rem; border: 1px solid var(--border);">Nome</th>
          <th style="text-align:left; padding:0.5rem; border: 1px solid var(--border);">Liderança</th>
          <th style="text-align:left; padding:0.5rem; border: 1px solid var(--border);">CNPJ</th>
          <th style="text-align:center; padding:0.5rem; border: 1px solid var(--border);">Ações</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    ultimos.forEach((ent) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';
      const tdNome = document.createElement('td');
      const tdLideranca = document.createElement('td');
      const tdCnpj = document.createElement('td');
      const tdAcoes = document.createElement('td');
      tdNome.style.padding = '0.5rem';
      tdLideranca.style.padding = '0.5rem';
      tdCnpj.style.padding = '0.5rem';
      tdAcoes.style.padding = '0.5rem';
      tdAcoes.style.textAlign = 'center';
      tdNome.textContent = ent.nome || '';
      tdLideranca.textContent = (ent.liderancas || []).join(', ') || '—';
      tdCnpj.textContent = ent.cnpj ? aplicarMascaraCnpj(ent.cnpj) : '—';
      // Botões de ação
      const btnEditar = document.createElement('button');
      btnEditar.type = 'button';
      btnEditar.className = 'button button--secondary';
      btnEditar.textContent = 'Editar';
      btnEditar.setAttribute('data-editar', ent.id);
      const btnExcluir = document.createElement('button');
      btnExcluir.type = 'button';
      btnExcluir.className = 'button button--ghost';
      btnExcluir.textContent = 'Excluir';
      btnExcluir.style.marginLeft = '0.5rem';
      btnExcluir.setAttribute('data-excluir', ent.id);
      tdAcoes.appendChild(btnEditar);
      tdAcoes.appendChild(btnExcluir);
      tr.appendChild(tdNome);
      tr.appendChild(tdLideranca);
      tr.appendChild(tdCnpj);
      tr.appendChild(tdAcoes);
      tbody.appendChild(tr);
    });

    listaEl.appendChild(table);
  };

  listaEl?.addEventListener('click', async (e) => {
    const editarId = e.target.getAttribute('data-editar');
    const excluirId = e.target.getAttribute('data-excluir');

    if (editarId) {
      const alvo = estado.entidades.find((ent) => ent.id === editarId);
      if (alvo) preencherFormulario(alvo);
    }

    if (excluirId) {
      if (!confirm('Deseja remover esta entidade?')) return;
      try {
        const resposta = await fetchAutenticado(`${API_ENTIDADES}/${excluirId}`, { method: 'DELETE' });
        if (!resposta.ok) throw new Error('Falha ao remover entidade');
        exibirMensagem(listaMsgEl, 'Entidade removida com sucesso.', 'success');
        await carregarEntidades();
      } catch (error) {
        exibirMensagem(listaMsgEl, error.message || 'Erro ao remover entidade', 'error');
      }
    }
  });

  // Preenche formulário para edição baseada nos dados retornados da API
  const preencherFormulario = (entidade) => {
    estado.emEdicao = entidade.id;
    estado.liderancas = [...(entidade.liderancas || [])];
    estado.telefones = (entidade.telefones || []).map((t) => t.numero || t);
    estado.enderecos = (entidade.enderecos || []).map((e) => ({
      uf: e.uf || '',
      logradouro: e.logradouro || '',
      bairro: `${e.bairro || ''} ${e.cidade || ''}`.trim(),
      cep: aplicarMascaraCep(e.cep || ''),
      complemento: e.complemento || '',
      latLong: e.latLong || '',
      mostrarLinkEndereco: true,
      mostrarLinkLatLong: true,
    }));
    estado.indicadorEnderecoAtual = estado.enderecos.length ? 0 : null;
    estado.fotosAtuais = [...(entidade.fotos || [])];
    estado.fotosParaRemover = [];

    document.getElementById('entidade-nome').value = entidade.nome || '';
    document.getElementById('entidade-cnpj').value = aplicarMascaraCnpj(entidade.cnpj);
    document.getElementById('entidade-descricao').value = entidade.descricao || '';
    submitBtn.textContent = 'Salvar';

    renderizarLiderancas();
    renderizarTelefones();
    renderizarEnderecos();
    renderizarFotosAtuais();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const carregarEntidades = async () => {
    exibirMensagem(listaMsgEl, 'Carregando entidades...', 'info');
    try {
      const resposta = await fetchAutenticado(API_ENTIDADES);
      const dados = await resposta.json().catch(() => []);
      if (!resposta.ok) throw new Error('Não foi possível listar as entidades.');
      // API já retorna ordenado por atualizadoEm DESC. Mantemos e limitamos na renderização.
      estado.entidades = Array.isArray(dados) ? dados : [];
      exibirMensagem(listaMsgEl, 'Exibindo os 10 últimos registros.', 'success');
      renderizarLista();
    } catch (error) {
      exibirMensagem(listaMsgEl, error.message || 'Erro ao buscar entidades', 'error');
    }
  };

  filtroEl?.addEventListener('input', (e) => {
    estado.filtro = e.target.value || '';
    renderizarLista();
  });

  listarBtn?.addEventListener('click', () => carregarEntidades());

  // Estado inicial limpo e um load inicial para popular a lista
  limparFormulario();
  carregarEntidades();
})();
