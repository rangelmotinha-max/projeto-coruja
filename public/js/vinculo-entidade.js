// Script para busca e vínculo de entidades na seção de vínculos do cadastro de pessoa
(function () {
  const input = document.getElementById('vinculo-entidade-busca');
  const btn = document.getElementById('buscar-vinculo-entidade');
  const status = document.getElementById('vinculo-entidade-status');
  const resultado = document.getElementById('vinculo-entidade-resultado');

  if (!input || !btn || !status || !resultado) return;

  // Comentário: centraliza a exibição do status junto ao small dedicado
  const exibirStatusVinculo = (texto, tipo = 'info') => {
    status.textContent = texto || '';
    status.className = '';
    if (texto) status.classList.add('message', `message--${tipo}`);
  };

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
  const renderizarConfirmacaoVinculo = (entidade) => {
    resultado.className = 'panel';
    resultado.innerHTML = `
      <div>Entidade encontrada: <b>${entidade.nome}</b><br>Deseja vincular essa entidade?<br>
        <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
          <button id="vincular-entidade-btn" class="button button--primary" type="button">Sim</button>
          <button id="nao-vincular-entidade-btn" class="button button--ghost" type="button">Não</button>
        </div>
      </div>`;
    resultado.style.display = 'block';

    const btnSim = document.getElementById('vincular-entidade-btn');
    const btnNao = document.getElementById('nao-vincular-entidade-btn');

    btnSim.onclick = function() {
      const nomeNormalizado = (entidade.nome || '').trim().toLowerCase();

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

        window.vinculosEntidades.push({ nome: entidade.nome, observacoes: '' });
        if (window.renderizarVinculosEntidades) window.renderizarVinculosEntidades();
      }

      exibirMensagemResultado('Entidade vinculada com sucesso.', 'success');
      exibirStatusVinculo('Entidade vinculada ao cadastro.', 'success');
    };

    btnNao.onclick = function() {
      limparPainelResultado();
      exibirStatusVinculo('Busca cancelada.', 'info');
    };
  };

  btn.addEventListener('click', async () => {
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

      const entidades = Array.isArray(data) ? data : data?.data || [];
      limparPainelResultado();

      if (entidades.length > 0) {
        renderizarConfirmacaoVinculo(entidades[0]);
        exibirMensagemResultado('');
        exibirStatusVinculo('', 'info');
      } else {
        resultado.innerHTML = `<div>Entidade não encontrada, deseja cadastrar?<br><button id="cadastrar-entidade-btn" class="button button--primary" type="button">Sim</button></div>`;
        resultado.style.display = 'block';
        exibirStatusVinculo('Nenhuma entidade encontrada para o termo informado.', 'info');
        document.getElementById('cadastrar-entidade-btn').onclick = function() {
          window.open('/cadastro/entidades', '_blank');
        };
      }
    } catch (e) {
      exibirMensagemResultado(e?.message || 'Erro ao buscar entidade.', 'error');
      exibirStatusVinculo('Erro ao buscar entidade.', 'error');
    }
  });
})();
