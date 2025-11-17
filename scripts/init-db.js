const { initDatabase, dbPath } = require('../src/database/sqlite');

(async () => {
  try {
    await initDatabase();
    console.log(`Banco SQLite preparado em: ${dbPath}`);
  } catch (erro) {
    console.error('Falha ao inicializar o banco de dados:', erro);
    process.exitCode = 1;
  }
})();
