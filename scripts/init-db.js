const { initDatabase, dbPath } = require('../src/database/sqlite');
const { seedAdmin } = require('./seed-admin');

(async () => {
  try {
    await initDatabase();
    await seedAdmin();
    console.log(`Banco SQLite preparado em: ${dbPath}`);
  } catch (erro) {
    console.error('Falha ao inicializar o banco de dados:', erro);
    process.exitCode = 1;
  }
})();
