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
  const fotosInput = document.getElementById('entidade-fotos');
  const fotosContainer = document.getElementById('lista-fotos-entidade');

  // Estado local em memória para simplificar renderizações
  const estado = {
    entidades: [],
    filtro: '',
    emEdicao: null,
    liderancas: [],
    telefones: [],
    enderecos: [],
    indicadorEnderecoAtual: null,
    fotosSelecionadas: [],
    fotosParaRemover: [],
    preservarFotosNoReset: false,
  };
  const LIMITE_FOTOS_ENTIDADE = 10;

  // Helpers de autenticação reciclados de outras páginas
  const getCookie = (name) => document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))?.split('=')[1];
  const obterToken = () => localStorage.getItem('authToken') || getCookie('authToken');
  const fetchAutenticado = (url, options = {}) => {
    const token = obterToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    return fetch(url, { ...options, headers });
  };

  // Diálogo de confirmação reutilizável
  const confirmarExclusao = (mensagem = 'Deseja realmente excluir esse registro?') => {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.45)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '1000';

      const modal = document.createElement('div');
      modal.className = 'panel';
      modal.style.maxWidth = '420px';
      modal.style.width = '90%';
      modal.style.padding = '1rem';
      modal.style.background = 'var(--surface)';
      modal.style.border = '1px solid var(--border)';
      modal.style.borderRadius = '0.5rem';
      modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';

      const texto = document.createElement('p');
      texto.textContent = mensagem;
      texto.style.margin = '0 0 0.75rem';
      texto.style.textAlign = 'center';

      const botoes = document.createElement('div');
      botoes.style.display = 'flex';
      botoes.style.gap = '0.5rem';
      botoes.style.justifyContent = 'center';

      const btnSim = document.createElement('button');
      btnSim.type = 'button';
      btnSim.className = 'button button--danger';
      btnSim.textContent = 'Sim';
      const btnNao = document.createElement('button');
      btnNao.type = 'button';
      btnNao.className = 'button button--secondary';
      btnNao.textContent = 'Não';

      const fechar = (valor) => { try { document.body.removeChild(overlay); } catch {} resolve(valor); };
      btnSim.addEventListener('click', () => fechar(true));
      btnNao.addEventListener('click', () => fechar(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(false); });
      window.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { window.removeEventListener('keydown', esc); fechar(false); } });

      botoes.appendChild(btnSim);
      botoes.appendChild(btnNao);
      modal.appendChild(texto);
      modal.appendChild(botoes);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
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

  const aplicarMascaraCpf = (valor) => {
    const dig = String(valor || '').replace(/\D/g, '').slice(0, 11);
    if (dig.length <= 3) return dig;
    const p1 = dig.slice(0, 3);
    const p2 = dig.slice(3, 6);
    const p3 = dig.slice(6, 9);
    const p4 = dig.slice(9);
    return `${p1}${p2 ? `.${p2}` : ''}${p3 ? `.${p3}` : ''}${p4 ? `-${p4}` : ''}`;
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
    estado.liderancas.forEach((lideranca, index) => {
      const liderancaNormalizada = typeof lideranca === 'string'
        ? { nome: lideranca, cpf: '' }
        : { nome: lideranca?.nome || '', cpf: lideranca?.cpf || '' };
      // Comentário: garante que o estado fique sempre em formato de objeto.
      estado.liderancas[index] = { ...liderancaNormalizada };
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

      // Grid com campos de nome e CPF da liderança
      const grid = document.createElement('div');
      grid.className = 'form__grid form__grid--2';
      grid.innerHTML = `
        <label class="form__field" style="margin:0;">
          <span class="form__label">Nome da liderança</span>
          <input class="form__input" type="text" value="${liderancaNormalizada.nome || ''}" data-lideranca-index="${index}" data-lideranca-campo="nome" />
        </label>
        <label class="form__field" style="margin:0;">
          <span class="form__label">CPF da liderança</span>
          <input class="form__input" type="text" inputmode="numeric" value="${aplicarMascaraCpf(liderancaNormalizada.cpf || '')}" placeholder="000.000.000-00" data-lideranca-index="${index}" data-lideranca-campo="cpf" />
        </label>
      `;
      bloco.appendChild(grid);

      const inputNome = bloco.querySelector('input[data-lideranca-campo="nome"]');
      const inputCpf = bloco.querySelector('input[data-lideranca-campo="cpf"]');
      try { inputCpf?.setAttribute('maxlength', '14'); } catch {}
      inputNome.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-lideranca-index'));
        estado.liderancas[idx].nome = e.target.value;
      });
      inputCpf.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-lideranca-index'));
        const valorMascarado = aplicarMascaraCpf(e.target.value);
        e.target.value = valorMascarado;
        estado.liderancas[idx].cpf = valorMascarado;
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
      btnRemover.addEventListener('click', async () => {
        const temDados = String(inputTelefone.value||'').trim();
        if (temDados) {
          const ok = await confirmarExclusao();
          if (!ok) return;
        }
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
      removerBtn.addEventListener('click', async () => {
        const e = estado.enderecos[indiceOrdenado] || {};
        const temDados = [e.uf, e.logradouro, e.bairro, e.complemento, e.cep, e.latLong]
          .some(v => String(v||'').trim());
        if (temDados) {
          const ok = await confirmarExclusao();
          if (!ok) return;
        }
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

  // Fotos do cadastro seguindo o padrão de pessoas/empresas
  const renderizarFotosEntidade = () => {
    if (!fotosContainer) return;
    fotosContainer.innerHTML = '';

    if (!estado.fotosSelecionadas.length) {
      fotosContainer.innerHTML = '';
      return;
    }

    estado.fotosSelecionadas.forEach((foto, index) => {
      const wrapper = document.createElement('div');
      wrapper.style.border = '1px solid var(--border)';
      wrapper.style.padding = '0.5rem';
      wrapper.style.borderRadius = '0.5rem';
      wrapper.style.background = 'var(--surface)';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.gap = '0.5rem';
      wrapper.style.position = 'relative';
      wrapper.style.overflow = 'hidden';

      const img = document.createElement('img');
      img.src = foto.previewUrl;
      img.alt = foto.nome || 'Foto selecionada';
      img.style.width = '100%';
      img.style.height = '140px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '0.35rem';

      const legend = document.createElement('div');
      legend.textContent = foto.nome || 'Foto';
      legend.style.fontSize = '0.9rem';
      legend.style.fontWeight = '600';
      legend.style.textAlign = 'center';
      legend.style.alignSelf = 'center';
      legend.style.marginTop = '0.25rem';

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '0.35rem';
      actions.style.alignItems = 'center';
      actions.style.alignSelf = 'stretch';
      actions.style.justifyContent = 'flex-start';
      actions.style.marginTop = '0.25rem';
      actions.style.padding = '0';
      actions.style.width = '100%';
      actions.style.flexWrap = 'nowrap';
      actions.style.whiteSpace = 'nowrap';

      const abrirBtn = document.createElement('button');
      abrirBtn.type = 'button';
      abrirBtn.className = 'button button--ghost';
      abrirBtn.textContent = 'Abrir';
      abrirBtn.style.flex = '0 0 auto';
      abrirBtn.style.minWidth = 'auto';
      abrirBtn.style.padding = '0.25rem 0.6rem';
      abrirBtn.style.fontSize = '0.85rem';
      abrirBtn.style.lineHeight = '1.2';
      abrirBtn.addEventListener('click', () => {
        // Comentário: abre a pré-visualização em nova aba para inspeção rápida.
        const url = foto?.previewUrl;
        if (url) window.open(url, '_blank');
      });

      const removerBtn = document.createElement('button');
      removerBtn.type = 'button';
      removerBtn.className = 'button button--ghost';
      removerBtn.textContent = 'Remover';
      removerBtn.style.flex = '0 0 auto';
      removerBtn.style.minWidth = 'auto';
      removerBtn.style.padding = '0.25rem 0.6rem';
      removerBtn.style.fontSize = '0.85rem';
      removerBtn.style.lineHeight = '1.2';
      removerBtn.addEventListener('click', () => removerFotoEntidade(index));

      wrapper.appendChild(img);
      wrapper.appendChild(legend);
      actions.appendChild(abrirBtn);
      actions.appendChild(removerBtn);
      wrapper.appendChild(actions);
      fotosContainer.appendChild(wrapper);
    });
  };

  const adicionarFotosEntidade = (arquivos = []) => {
    const arquivosValidos = Array.from(arquivos).filter((arquivo) => arquivo.type?.startsWith('image/'));
    const espacosDisponiveis = Math.max(LIMITE_FOTOS_ENTIDADE - estado.fotosSelecionadas.length, 0);

    if (!espacosDisponiveis) {
      // Comentário: comunica ao usuário que o limite já foi alcançado.
      exibirMensagem(formMsgEl, `Limite máximo de ${LIMITE_FOTOS_ENTIDADE} fotos atingido. Remova alguma para adicionar novas.`, 'warning');
      return;
    }

    if (arquivosValidos.length > espacosDisponiveis) {
      // Comentário: mantém apenas a quantidade permitida e informa o excesso.
      exibirMensagem(formMsgEl, `Você selecionou mais de ${LIMITE_FOTOS_ENTIDADE} fotos. Apenas ${espacosDisponiveis} serão adicionadas.`, 'warning');
    }

    arquivosValidos.slice(0, espacosDisponiveis).forEach((arquivo) => {
      estado.fotosSelecionadas.push({
        file: arquivo,
        nome: arquivo.name,
        previewUrl: URL.createObjectURL(arquivo),
      });
    });
    renderizarFotosEntidade();
  };

  const removerFotoEntidade = async (index) => {
    const foto = estado.fotosSelecionadas[index];
    if (!foto) return;
    const ok = await confirmarExclusao();
    if (!ok) return;
    const [removida] = estado.fotosSelecionadas.splice(index, 1);
    if (removida?.existing && removida.referencia) {
      estado.fotosParaRemover.push(removida.referencia);
    }
    if (removida?.previewUrl && removida.file) {
      URL.revokeObjectURL(removida.previewUrl);
    }
    renderizarFotosEntidade();
  };

  const carregarFotosEntidadeExistentes = (fotos = []) => {
    if (!Array.isArray(fotos)) {
      estado.fotosSelecionadas = [];
      estado.fotosParaRemover = [];
      renderizarFotosEntidade();
      return;
    }
    estado.fotosParaRemover = [];
    estado.fotosSelecionadas = fotos.map((foto, index) => {
      const referencia = foto?.id || foto?.url || foto;
      const nome = foto?.nomeArquivo || foto?.nome_arquivo || foto?.nome || `Foto ${index + 1}`;
      return {
        existing: true,
        referencia,
        nome,
        previewUrl: foto?.url || foto?.previewUrl || referencia,
      };
    });
    renderizarFotosEntidade();
  };

  const validarFotosPersistidas = async (entidadeId, fotosEsperadas = []) => {
    if (!entidadeId) {
      return [];
    }

    try {
      exibirMensagem(formMsgEl, 'Validando fotos salvas...', 'info');

      const response = await fetchAutenticado(`${API_ENTIDADES}/${entidadeId}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const erro = data?.mensagem || data?.message || 'Erro ao confirmar fotos salvas.';
        throw new Error(erro);
      }

      const fotosServidor = (data?.fotos || data?.imagens || []).filter(Boolean);
      const existemFotosServidor = Array.isArray(fotosServidor) && fotosServidor.length > 0;

      if (existemFotosServidor) {
        const resumoFotos = fotosServidor.map((foto, index) => ({
          id: foto?.id || foto?.url || foto,
          url: foto?.url || foto?.previewUrl || foto?.id || foto,
          ordem: index + 1,
        }));
        console.info('Resumo das fotos persistidas:', resumoFotos);

        carregarFotosEntidadeExistentes(fotosServidor);
        exibirMensagem(formMsgEl, '', 'info');
      } else if (Array.isArray(fotosEsperadas) && fotosEsperadas.length > 0) {
        exibirMensagem(
          formMsgEl,
          'Atenção: as fotos não foram localizadas após salvar. Reenvie as imagens se necessário.',
          'error'
        );
      } else {
        exibirMensagem(formMsgEl, 'Nenhuma foto foi localizada para este cadastro.', 'warning');
      }

      return fotosServidor;
    } catch (error) {
      exibirMensagem(formMsgEl, error?.message || 'Erro ao validar fotos salvas.', 'error');
      return [];
    }
  };

  // Adição de novos itens nas listas
  document.getElementById('adicionar-lideranca')?.addEventListener('click', () => {
    estado.liderancas.push({ nome: '', cpf: '' });
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
  liderancasContainer.addEventListener('click', async (e) => {
    const idx = e.target.getAttribute('data-remover-lideranca');
    if (idx !== null) {
      const i = Number(idx);
      const lideranca = estado.liderancas[i] || {};
      const temDados = [lideranca.nome, lideranca.cpf].some((valor) => String(valor || '').trim());
      if (temDados) {
        const ok = await confirmarExclusao();
        if (!ok) return;
      }
      estado.liderancas.splice(i, 1);
      renderizarLiderancas();
    }
  });

  telefonesContainer.addEventListener('click', async (e) => {
    const idx = e.target.getAttribute('data-remover-telefone');
    if (idx !== null) {
      const i = Number(idx);
      const temDados = String(estado.telefones[i] || '').trim();
      if (temDados) {
        const ok = await confirmarExclusao();
        if (!ok) return;
      }
      estado.telefones.splice(i, 1);
      renderizarTelefones();
    }
  });

  enderecosContainer.addEventListener('click', async (e) => {
    const idx = e.target.getAttribute('data-remover-endereco');
    if (idx !== null) {
      const i = Number(idx);
      const eend = estado.enderecos[i] || {};
      const temDados = [eend.uf, eend.logradouro, eend.bairro, eend.complemento, eend.cep, eend.latLong]
        .some(v => String(v||'').trim());
      if (temDados) {
        const ok = await confirmarExclusao();
        if (!ok) return;
      }
      estado.enderecos.splice(i, 1);
      renderizarEnderecos();
    }
  });

  fotosInput?.addEventListener('change', (event) => {
    // Comentário: adiciona fotos novas ao estado e mantém as existentes.
    adicionarFotosEntidade(event.target.files);
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
    const liderancasNormalizadas = estado.liderancas.map((lideranca) => {
      if (typeof lideranca === 'string') {
        return { nome: lideranca.trim(), cpf: '' };
      }
      return {
        nome: String(lideranca?.nome || '').trim(),
        cpf: String(aplicarMascaraCpf(lideranca?.cpf || '') || '').trim(),
      };
    }).filter((lideranca) => lideranca.nome || lideranca.cpf);
    dados.append('liderancas', JSON.stringify(liderancasNormalizadas));
    dados.append('telefones', JSON.stringify(estado.telefones.map((t) => t || '').filter(Boolean)));
    dados.append('enderecos', JSON.stringify(estado.enderecos));
    dados.append('endereco_atual_index', estado.indicadorEnderecoAtual === null ? '' : String(estado.indicadorEnderecoAtual));
    dados.append('fotosParaRemover', JSON.stringify(estado.fotosParaRemover));

    const fotosExistentes = estado.fotosSelecionadas
      .filter((foto) => foto.existing)
      .map((foto) => ({ referencia: foto.referencia, nome: foto.nome }));
    dados.append('fotosExistentes', JSON.stringify(fotosExistentes));

    estado.fotosSelecionadas.forEach((foto, index) => {
      if (!foto?.file) return;
      dados.append('fotos', foto.file, foto.nome || foto.file.name || `foto-${index + 1}.jpg`);
    });
    return dados;
  };

  const limparFormulario = () => {
    form?.reset();
    estado.emEdicao = null;
    estado.liderancas = [];
    estado.telefones = [];
    estado.enderecos = [];
    estado.indicadorEnderecoAtual = null;
    const devePreservarGaleria = estado.preservarFotosNoReset && estado.fotosSelecionadas.length > 0;
    estado.fotosParaRemover = [];
    if (!devePreservarGaleria) {
      estado.fotosSelecionadas = [];
    }
    submitBtn.textContent = 'Incluir';
    exibirMensagem(formMsgEl, '');
    renderizarLiderancas();
    renderizarTelefones();
    renderizarEnderecos();
    renderizarFotosEntidade();
    estado.preservarFotosNoReset = false;
    if (fotosInput) fotosInput.value = '';
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
      // Comentário: limpa mensagem do formulário após sucesso.
      exibirMensagem(formMsgEl, '');
      const fotosPersistidas = (dados?.fotos || dados?.imagens || []).filter(Boolean);
      const existeGaleriaPersistida = Array.isArray(fotosPersistidas) && fotosPersistidas.length > 0;
      const entidadeIdResposta = dados?.id || dados?._id || estado.emEdicao || null;
      estado.preservarFotosNoReset = existeGaleriaPersistida;
      limparFormulario();
      if (existeGaleriaPersistida) {
        carregarFotosEntidadeExistentes(fotosPersistidas);
      }
      if (entidadeIdResposta) {
        await validarFotosPersistidas(entidadeIdResposta, fotosPersistidas);
      } else if (existeGaleriaPersistida) {
        exibirMensagem(formMsgEl, 'Não foi possível validar as fotos porque o ID não foi retornado.', 'warning');
      }
      await carregarEntidades();
    } catch (error) {
      exibirMensagem(formMsgEl, error.message || 'Erro ao salvar entidade', 'error');
    } finally {
      submitBtn.disabled = false;
      if (fotosInput) fotosInput.value = '';
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
      const nomesLiderancas = (ent.liderancas || [])
        .map((lideranca) => typeof lideranca === 'string' ? lideranca : lideranca?.nome)
        .map((nome) => String(nome || '').trim())
        .filter(Boolean);
      tdLideranca.textContent = nomesLiderancas.join(', ') || '—';
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
      const ok = await confirmarExclusao('Deseja remover esta entidade?');
      if (!ok) return;
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
    estado.liderancas = (entidade.liderancas || []).map((lideranca) => {
      if (typeof lideranca === 'string') {
        return { nome: lideranca, cpf: '' };
      }
      return {
        nome: lideranca?.nome || '',
        cpf: aplicarMascaraCpf(lideranca?.cpf || ''),
      };
    });
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
    estado.fotosParaRemover = [];
    estado.preservarFotosNoReset = false;

    document.getElementById('entidade-nome').value = entidade.nome || '';
    document.getElementById('entidade-cnpj').value = aplicarMascaraCnpj(entidade.cnpj);
    document.getElementById('entidade-descricao').value = entidade.descricao || '';
    submitBtn.textContent = 'Salvar';

    renderizarLiderancas();
    renderizarTelefones();
    renderizarEnderecos();
    carregarFotosEntidadeExistentes(entidade.fotos || []);
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
