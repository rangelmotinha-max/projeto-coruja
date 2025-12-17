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

  // Estado local em memória para simplificar renderizações
  const estado = {
    entidades: [],
    filtro: '',
    emEdicao: null,
    liderancas: [],
    telefones: [],
    enderecos: [],
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
      const linha = document.createElement('div');
      linha.className = 'form__grid form__grid--2';
      linha.innerHTML = `
        <label class="form__field" style="margin:0;">
          <span class="form__label">Nome da liderança</span>
          <input class="form__input" type="text" value="${nome || ''}" data-lideranca-index="${index}" />
        </label>
        <div class="form__actions" style="margin:0; justify-content:flex-end;">
          <button class="button button--ghost" type="button" data-remover-lideranca="${index}">Remover</button>
        </div>
      `;
      liderancasContainer.appendChild(linha);
    });
  };

  const renderizarTelefones = () => {
    telefonesContainer.innerHTML = '';
    estado.telefones.forEach((numero, index) => {
      const linha = document.createElement('div');
      linha.className = 'form__grid form__grid--2';
      linha.innerHTML = `
        <label class="form__field" style="margin:0;">
          <span class="form__label">Telefone</span>
          <input class="form__input" type="tel" value="${aplicarMascaraTelefone(numero)}" data-telefone-index="${index}" />
        </label>
        <div class="form__actions" style="margin:0; justify-content:flex-end;">
          <button class="button button--ghost" type="button" data-remover-telefone="${index}">Remover</button>
        </div>
      `;
      const input = linha.querySelector('input');
      input.addEventListener('input', (e) => {
        const mascara = aplicarMascaraTelefone(e.target.value);
        e.target.value = mascara;
        estado.telefones[index] = mascara;
      });
      telefonesContainer.appendChild(linha);
    });
  };

  const renderizarEnderecos = () => {
    enderecosContainer.innerHTML = '';
    estado.enderecos.forEach((endereco, index) => {
      const bloco = document.createElement('div');
      bloco.className = 'form__grid form__grid--2';
      bloco.style.gap = '0.5rem';
      bloco.innerHTML = `
        <label class="form__field" style="margin:0;">
          <span class="form__label">Logradouro</span>
          <input class="form__input" type="text" data-endereco-logradouro="${index}" value="${endereco.logradouro || ''}" />
        </label>
        <label class="form__field" style="margin:0;">
          <span class="form__label">Bairro</span>
          <input class="form__input" type="text" data-endereco-bairro="${index}" value="${endereco.bairro || ''}" />
        </label>
        <label class="form__field" style="margin:0;">
          <span class="form__label">Cidade</span>
          <input class="form__input" type="text" data-endereco-cidade="${index}" value="${endereco.cidade || ''}" />
        </label>
        <label class="form__field" style="margin:0;">
          <span class="form__label">UF</span>
          <input class="form__input" type="text" maxlength="2" data-endereco-uf="${index}" value="${(endereco.uf || '').toUpperCase()}" />
        </label>
        <label class="form__field" style="margin:0;">
          <span class="form__label">CEP</span>
          <input class="form__input" type="text" data-endereco-cep="${index}" value="${aplicarMascaraCep(endereco.cep)}" />
        </label>
        <label class="form__field" style="margin:0;">
          <span class="form__label">Complemento</span>
          <input class="form__input" type="text" data-endereco-complemento="${index}" value="${endereco.complemento || ''}" />
        </label>
        <div class="form__actions" style="grid-column: 1 / -1; justify-content:flex-end;">
          <button class="button button--ghost" type="button" data-remover-endereco="${index}">Remover endereço</button>
        </div>
      `;
      bloco.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', (e) => {
          const idx = Number(e.target.getAttribute('data-endereco-logradouro')
            || e.target.getAttribute('data-endereco-bairro')
            || e.target.getAttribute('data-endereco-cidade')
            || e.target.getAttribute('data-endereco-uf')
            || e.target.getAttribute('data-endereco-cep')
            || e.target.getAttribute('data-endereco-complemento'));

          const atual = estado.enderecos[idx] || {};
          if (e.target.hasAttribute('data-endereco-logradouro')) atual.logradouro = e.target.value;
          if (e.target.hasAttribute('data-endereco-bairro')) atual.bairro = e.target.value;
          if (e.target.hasAttribute('data-endereco-cidade')) atual.cidade = e.target.value;
          if (e.target.hasAttribute('data-endereco-uf')) atual.uf = e.target.value.toUpperCase();
          if (e.target.hasAttribute('data-endereco-cep')) atual.cep = aplicarMascaraCep(e.target.value);
          if (e.target.hasAttribute('data-endereco-complemento')) atual.complemento = e.target.value;
          estado.enderecos[idx] = atual;
          if (e.target.hasAttribute('data-endereco-cep')) e.target.value = atual.cep || '';
        });
      });
      enderecosContainer.appendChild(bloco);
    });
  };

  // Fotos atuais com opção de remoção
  const renderizarFotosAtuais = () => {
    fotosAtuaisContainer.innerHTML = '';
    estado.fotosAtuais.forEach((foto) => {
      const card = document.createElement('div');
      card.className = 'card card--subtle';
      card.style.padding = '0.5rem';
      card.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.35rem; align-items:flex-start;">
          ${foto.url ? `<img src="${foto.url}" alt="Foto da entidade" style="width:100%; height:120px; object-fit:cover; border-radius:8px;" />` : ''}
          <span style="font-size: 0.9rem;">${foto.nomeArquivo || 'Foto'}</span>
          <button class="button button--ghost" type="button" data-remover-foto="${foto.id}">Remover</button>
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
    estado.enderecos.push({});
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
    const fotoId = e.target.getAttribute('data-remover-foto');
    if (fotoId) {
      estado.fotosParaRemover.push(fotoId);
      estado.fotosAtuais = estado.fotosAtuais.filter((f) => f.id !== fotoId);
      renderizarFotosAtuais();
    }
  });

  // Coleta de dados do formulário e envio para API
  const coletarDadosFormulario = () => {
    const dados = new FormData();
    dados.append('nome', document.getElementById('entidade-nome')?.value.trim() || '');
    dados.append('cnpj', aplicarMascaraCnpj(document.getElementById('entidade-cnpj')?.value));
    dados.append('descricao', document.getElementById('entidade-descricao')?.value.trim() || '');
    dados.append('liderancas', JSON.stringify(estado.liderancas.map((l) => (l || '').trim()).filter(Boolean)));
    dados.append('telefones', JSON.stringify(estado.telefones.map((t) => t || '').filter(Boolean)));
    dados.append('enderecos', JSON.stringify(estado.enderecos));
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

      exibirMensagem(formMsgEl, 'Entidade salva com sucesso!', 'success');
      limparFormulario();
      await carregarEntidades();
    } catch (error) {
      exibirMensagem(formMsgEl, error.message || 'Erro ao salvar entidade', 'error');
    } finally {
      submitBtn.disabled = false;
      fotosInput.value = '';
    }
  });

  // Renderiza cartões da lista com filtros em memória
  const renderizarLista = () => {
    listaEl.innerHTML = '';
    const termo = estado.filtro.toLowerCase();
    const filtradas = estado.entidades.filter((ent) => {
      const nomeOk = ent.nome.toLowerCase().includes(termo);
      const cnpjOk = aplicarMascaraCnpj(ent.cnpj).toLowerCase().includes(termo);
      const telefoneOk = (ent.telefones || []).some((t) => aplicarMascaraTelefone(t.numero || t).toLowerCase().includes(termo));
      return nomeOk || cnpjOk || telefoneOk;
    });

    if (!filtradas.length) {
      listaEl.innerHTML = '<p class="muted">Nenhuma entidade encontrada.</p>';
      return;
    }

    filtradas.forEach((ent) => {
      const card = document.createElement('div');
      card.className = 'list__item';
      card.innerHTML = `
        <div class="list__content">
          <div class="list__title-row">
            <div>
              <p class="list__eyebrow">${ent.cnpj ? aplicarMascaraCnpj(ent.cnpj) : 'Sem CNPJ'}</p>
              <h4 class="list__title">${ent.nome}</h4>
            </div>
            <div class="list__actions">
              <button class="button button--secondary" data-editar="${ent.id}">Editar</button>
              <button class="button button--ghost" data-excluir="${ent.id}">Excluir</button>
            </div>
          </div>
          <p class="list__description">${ent.descricao || 'Sem descrição cadastrada.'}</p>
          <div class="list__meta">
            <span><strong>Lideranças:</strong> ${(ent.liderancas || []).join(', ') || '—'}</span>
            <span><strong>Telefones:</strong> ${(ent.telefones || []).map((t) => aplicarMascaraTelefone(t.numero || t)).join(', ') || '—'}</span>
            <span><strong>Endereços:</strong> ${(ent.enderecos || []).map((e) => e.logradouro || e.bairro || e.cidade).filter(Boolean).join(' | ') || '—'}</span>
            <span><strong>Fotos:</strong> ${(ent.fotos || []).length}</span>
          </div>
        </div>
      `;
      listaEl.appendChild(card);
    });
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
    estado.enderecos = (entidade.enderecos || []).map((e) => ({ ...e }));
    estado.fotosAtuais = [...(entidade.fotos || [])];
    estado.fotosParaRemover = [];

    document.getElementById('entidade-nome').value = entidade.nome || '';
    document.getElementById('entidade-cnpj').value = aplicarMascaraCnpj(entidade.cnpj);
    document.getElementById('entidade-descricao').value = entidade.descricao || '';
    submitBtn.textContent = 'Atualizar';

    renderizarLiderancas();
    renderizarTelefones();
    renderizarEnderecos();
    renderizarFotosAtuais();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    exibirMensagem(formMsgEl, 'Modo edição ativo. Ajuste os campos e salve.', 'info');
  };

  const carregarEntidades = async () => {
    exibirMensagem(listaMsgEl, 'Carregando entidades...', 'info');
    try {
      const resposta = await fetchAutenticado(API_ENTIDADES);
      const dados = await resposta.json().catch(() => []);
      if (!resposta.ok) throw new Error('Não foi possível listar as entidades.');
      estado.entidades = dados;
      exibirMensagem(listaMsgEl, `${dados.length} registro(s) encontrados.`, 'success');
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
