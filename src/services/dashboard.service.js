const { initDatabase } = require('../database/sqlite');

// Usuários: totais e distribuição por perfil
async function getUsuariosSummary() {
  const db = await initDatabase();
  const totalRow = await db.get('SELECT COUNT(*) AS total FROM usuarios');

  const roles = await db.all(
    `SELECT LOWER(role) AS role, COUNT(*) AS total
     FROM usuarios
     GROUP BY LOWER(role)`
  );

  const byRole = Object.fromEntries(roles.map((r) => [r.role, r.total]));

  return {
    totalUsuarios: totalRow?.total || 0,
    porPerfil: {
      admin: byRole['admin'] || 0,
      leitor: byRole['leitor'] || 0,
      editor: byRole['editor'] || 0,
    },
  };
}

// Pessoas: totais e por UF
async function getPessoasSummary() {
  const db = await initDatabase();
  const totalRow = await db.get('SELECT COUNT(*) AS total FROM pessoas');
  const faccaoRow = await db.get('SELECT COUNT(*) AS total FROM pessoas WHERE faccao_id IS NOT NULL');

  const porUf = await db.all(
    `SELECT UPPER(COALESCE(uf, '—')) AS uf, COUNT(DISTINCT pessoa_id) AS total
     FROM enderecos
     GROUP BY UPPER(COALESCE(uf, '—'))
     ORDER BY total DESC, uf ASC`
  );

  return {
    totalPessoas: totalRow?.total || 0,
    pessoasComFaccao: faccaoRow?.total || 0,
    pessoasPorUF: porUf,
  };
}

// Empresas: total e situação cadastral (Ativa, Inativa, Inapta)
async function getEmpresasSummary() {
  const db = await initDatabase();
  const totalRow = await db.get('SELECT COUNT(*) AS total FROM empresas_cadastro');

  const situacoes = await db.all(
    `SELECT UPPER(COALESCE(situacaoCadastral, '—')) AS situacao, COUNT(*) AS total
     FROM empresas_cadastro
     GROUP BY UPPER(COALESCE(situacaoCadastral, '—'))`
  );
  const bySit = Object.fromEntries(situacoes.map((s) => [s.situacao, s.total]));

  return {
    totalEmpresas: totalRow?.total || 0,
    situacao: {
      Ativa: bySit['ATIVA'] || 0,
      Inativa: bySit['INATIVA'] || 0,
      Inapta: bySit['INAPTA'] || 0,
    },
  };
}

// Entidades: total e por UF (endereços)
async function getEntidadesSummary() {
  const db = await initDatabase();
  const totalRow = await db.get('SELECT COUNT(*) AS total FROM entidades');

  const porUf = await db.all(
    `SELECT UPPER(COALESCE(uf, '—')) AS uf, COUNT(DISTINCT entidade_id) AS total
     FROM entidades_enderecos
     GROUP BY UPPER(COALESCE(uf, '—'))
     ORDER BY total DESC, uf ASC`
  );

  return {
    totalEntidades: totalRow?.total || 0,
    entidadesPorUF: porUf,
  };
}

module.exports = {
  getUsuariosSummary,
  getPessoasSummary,
  getEmpresasSummary,
  getEntidadesSummary,
};
