// Script para busca e vínculo de entidades na seção de vínculos do cadastro de pessoa
(function () {
  const input = document.getElementById('vinculo-entidade-busca');
  const btn = document.getElementById('buscar-vinculo-entidade');
  const status = document.getElementById('vinculo-entidade-status');
  const resultado = document.getElementById('vinculo-entidade-resultado');
  // Comentário: armazena a lista de entidades retornadas para renderização do painel
  let resultadosBuscaEntidades = [];
  let mostrarMensagemResultadosEntidades = true;

  if (!input || !btn || !status || !resultado) return;

  // Comentário: centraliza a exibição do status junto ao small dedicado
  const exibirStatusVinculo = (texto, tipo = 'info') => {
    status.textContent = texto || '';
    status.className = 'message';
    status.style.display = texto ? 'block' : 'none';
    if (texto) status.classList.add(`message--${tipo}`);
  };
  // Comentário: garante que o status permaneça oculto até que haja algo para exibir
  exibirStatusVinculo('');

  // Comentário: limpa o painel de resultado ou mostra mensagem amigável
  const limparPainelResultado = (mostrarMensagem = false) => {
    resultado.className = 'panel';
    resultado.innerHTML = mostrarMensagem
      ? '<p style="color: var(--muted); margin: 0;">Nenhuma entidade encontrada.</p>'
      : '';
    resultado.style.display = mostrarMensagem ? 'block' : 'none';
  };

  // Comentário: apresenta mensagens de feedback reutilizando o painel de vínculo
  const exibirMensagemResultado = (texto, tipo = 'info') => {
    resultado.className = 'panel';
    if (texto) {
      resultado.innerHTML = `<div class="message message--${tipo}" style="margin:0;">${texto}</div>`;
      resultado.style.display = 'block';
    } else {
      resultado.innerHTML = '';
      resultado.style.display = 'none';
    }
  };

  // Comentário: monta a pergunta de vínculo quando a entidade é localizada
  const adicionarEntidadeVinculo = (entidade) => {
    const nomeInformado = (entidade.nome || entidade.nomeFantasia || entidade.razaoSocial || 'Entidade encontrada').trim();
    const nomeNormalizado = nomeInformado.toLowerCase();

    // Comentário: impede duplicidade aproveitando o estado global do formulário
    if (window.vinculosEntidades && Array.isArray(window.vinculosEntidades)) {
      const duplicado = window.vinculosEntidades.some(
        (e) => (e.nome || '').trim().toLowerCase() === nomeNormalizado,
      );

      if (duplicado) {
        exibirMensagemResultado('Esta entidade já está vinculada.', 'info');
        exibirStatusVinculo('Esta entidade já está vinculada.', 'info');
        return;
      }

      window.vinculosEntidades.push({ nome: nomeInformado, observacoes: entidade.lider || entidade.observacoes || '' });
      if (window.renderizarVinculosEntidades) window.renderizarVinculosEntidades();
    }

    exibirMensagemResultado('Entidade vinculada com sucesso.', 'success');
    exibirStatusVinculo('Entidade vinculada ao cadastro.', 'success');
  };

  // Comentário: exibe lista de resultados com ações de vínculo e cadastro
  const renderizarResultadosBusca = () => {
    resultado.className = 'panel';
    resultado.innerHTML = '';

    if (!resultadosBuscaEntidades.length) {
      if (mostrarMensagemResultadosEntidades) {
        resultado.innerHTML = `
          <div class="message message--info" style="margin:0 0 0.5rem 0;">Nenhuma entidade encontrada. Você pode cadastrar uma nova.</div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button id="cadastrar-entidade-btn" class="button button--primary" type="button">Cadastrar entidade</button>
            <button id="limpar-entidade-busca-btn" class="button button--ghost" type="button">Limpar busca</button>
          </div>
        `;
        resultado.style.display = 'block';
        document.getElementById('cadastrar-entidade-btn')?.addEventListener('click', () => window.open('/cadastro/entidades', '_blank'));
        document.getElementById('limpar-entidade-busca-btn')?.addEventListener('click', () => {
          resultadosBuscaEntidades = [];
          input.value = '';
          limparPainelResultado();
          exibirStatusVinculo('', 'info');
        });
      } else {
        limparPainelResultado();
      }
      return;
    }

    const titulo = document.createElement('div');
    titulo.innerHTML = '<strong>Selecione uma entidade para vincular</strong>';
    titulo.style.marginBottom = '0.5rem';
    resultado.appendChild(titulo);

    const lista = document.createElement('div');
    lista.style.display = 'flex';
    lista.style.flexDirection = 'column';
    lista.style.gap = '0.5rem';

    resultadosBuscaEntidades.forEach((entidade, indice) => {
      const card = document.createElement('div');
      card.className = 'panel';
      card.style.padding = '0.75rem';
      card.style.display = 'grid';
      card.style.gridTemplateColumns = '1fr auto';
      card.style.gap = '0.5rem';
      card.style.alignItems = 'center';

      const info = document.createElement('div');
      const lider = entidade.lider || entidade.lider_nome || entidade.liderNome || entidade.nomeLider || '';
      info.innerHTML = `
        <div style="font-weight:600;">${entidade.nome || 'Entidade encontrada'}</div>
        <div style="color: var(--muted);">${lider ? `Líder: ${lider}` : 'Sem líder informado'}</div>
      `;

      const acoes = document.createElement('div');
      acoes.style.display = 'flex';
      acoes.style.gap = '0.5rem';
      acoes.style.flexWrap = 'wrap';
      acoes.style.justifyContent = 'flex-end';

      const btnVincular = document.createElement('button');
      btnVincular.type = 'button';
      btnVincular.className = 'button button--primary';
      btnVincular.textContent = 'Vincular';
      btnVincular.addEventListener('click', () => adicionarEntidadeVinculo(entidade));

      const btnIgnorar = document.createElement('button');
      btnIgnorar.type = 'button';
      btnIgnorar.className = 'button button--ghost';
      btnIgnorar.textContent = 'Ignorar';
      btnIgnorar.addEventListener('click', () => {
        resultadosBuscaEntidades.splice(indice, 1);
        renderizarResultadosBusca();
      });

      acoes.appendChild(btnVincular);
      acoes.appendChild(btnIgnorar);

      card.appendChild(info);
      card.appendChild(acoes);
      lista.appendChild(card);
    });

    resultado.appendChild(lista);
    resultado.style.display = 'block';
  };

  const buscarEntidade = async () => {
    const termo = input.value.trim();
    limparPainelResultado();
    exibirStatusVinculo('');
    if (!termo) {
      exibirStatusVinculo('Digite o nome da entidade ou líder.', 'error');
      return;
    }
    exibirStatusVinculo('Procurando entidade...', 'info');
    exibirMensagemResultado('Buscando a entidade informada...', 'info');
    try {
      const resp = await fetchAutenticado(`/api/entidades?nome=${encodeURIComponent(termo)}`);
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const erroApi = data?.mensagem || data?.message || 'Não foi possível buscar entidades.';
        throw new Error(erroApi);
      }

      resultadosBuscaEntidades = Array.isArray(data) ? data : data?.data || [];
      mostrarMensagemResultadosEntidades = true;
      renderizarResultadosBusca();
      exibirStatusVinculo(
        resultadosBuscaEntidades.length ? 'Selecione uma entidade nos resultados abaixo.' : 'Nenhuma entidade encontrada para o termo informado.',
        'info',
      );
    } catch (e) {
      exibirMensagemResultado(e?.message || 'Erro ao buscar entidade.', 'error');
      exibirStatusVinculo('Erro ao buscar entidade.', 'error');
    }
  };

  btn.addEventListener('click', buscarEntidade);
  input.addEventListener('keydown', (event) => {
    // Comentário: permite acionar a busca ao pressionar Enter no campo de entrada
    if (event.key === 'Enter') {
      event.preventDefault();
      buscarEntidade();
    }
  });
})();
