// Script para busca e vínculo de entidades na seção de vínculos do cadastro de pessoa
(function () {
  const input = document.getElementById('vinculo-entidade-busca');
  const btn = document.getElementById('buscar-vinculo-entidade');
  const status = document.getElementById('vinculo-entidade-status');
  const resultado = document.getElementById('vinculo-entidade-resultado');

  if (!input || !btn || !status || !resultado) return;

  const showMessage = (msg, type = 'info') => {
    status.textContent = msg;
    status.className = '';
    if (msg) status.classList.add('message', `message--${type}`);
  };

  const showPanel = (html) => {
    resultado.innerHTML = html;
    resultado.style.display = 'block';
  };

  const hidePanel = () => {
    resultado.innerHTML = '';
    resultado.style.display = 'none';
  };

  btn.addEventListener('click', async () => {
    const termo = input.value.trim();
    hidePanel();
    showMessage('', 'info');
    if (!termo) {
      showMessage('Digite o nome da entidade ou líder.', 'error');
      return;
    }
    showMessage('Procurando entidade...', 'info');
    try {
      const resp = await fetch(`/api/entidades?nome=${encodeURIComponent(termo)}`);
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const entidade = data[0];
        showPanel(`<div>Entidade encontrada: <b>${entidade.nome}</b><br>Deseja vincular essa entidade?<br><div style="margin-top:0.5rem;display:flex;gap:0.5rem;"><button id="vincular-entidade-btn" class="button button--primary" type="button">Sim</button><button id="nao-vincular-entidade-btn" class="button button--ghost" type="button">Não</button></div></div>`);
        showMessage('', 'info');
        document.getElementById('vincular-entidade-btn').onclick = function() {
          // Adiciona ao array global do formulário
          if (window.vinculosEntidades && Array.isArray(window.vinculosEntidades)) {
            // Evita duplicidade
            if (!window.vinculosEntidades.some(e => (e.nome||'').trim().toLowerCase() === (entidade.nome||'').trim().toLowerCase())) {
              window.vinculosEntidades.push({ nome: entidade.nome, observacoes: '', descricao: '' });
              if (window.renderizarVinculosEntidades) window.renderizarVinculosEntidades();
            }
          }
          showMessage('Entidade vinculada!', 'success');
          hidePanel();
        };
        document.getElementById('nao-vincular-entidade-btn').onclick = function() {
          hidePanel();
        };
      } else {
        showPanel(`<div>Entidade não encontrada, deseja cadastrar?<br><button id="cadastrar-entidade-btn" class="button button--primary" type="button">Sim</button></div>`);
        showMessage('', 'info');
        document.getElementById('cadastrar-entidade-btn').onclick = function() {
          window.open('/cadastro/entidades', '_blank');
        };
      }
    } catch (e) {
      showMessage('Erro ao buscar entidade.', 'error');
    }
  });
})();
