const { initDatabase } = require('../database/sqlite');

async function getUsuariosSummary() {
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

module.exports = {
  getUsuariosSummary,
};
