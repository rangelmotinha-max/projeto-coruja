const { initDatabase } = require('../src/database/sqlite');

(async () => {
  try {
    const db = await initDatabase();
    await db.run('PRAGMA foreign_keys = OFF');
    await db.run('DROP INDEX IF EXISTS idx_veiculos_cpf');
    await db.run('DROP INDEX IF EXISTS idx_veiculos_placa');
    await db.run('DROP TABLE IF EXISTS veiculos');
    await db.run('PRAGMA foreign_keys = ON');
    console.log('Tabela veiculos removida com sucesso.');
  } catch (erro) {
    console.error('Erro ao remover tabela veiculos:', erro.message || erro);
    process.exitCode = 1;
  }
})();
