const { initDatabase } = require('../src/database/sqlite');

// Script utilitário para migrar telefones do campo legado para a tabela dedicada
// e remover duplicidades com transação para manter a integridade.
(async () => {
  const db = await initDatabase();
  const agora = new Date().toISOString();

  await db.beginTransaction();

  try {
    console.info('[telefones] Normalizando e removendo duplicidades...');
    const deduplicados = await db.run(
      `DELETE FROM telefones
       WHERE rowid NOT IN (
         SELECT MIN(rowid)
         FROM telefones
         GROUP BY pessoa_id, LOWER(TRIM(numero))
       )`
    );

    await db.run(
      `UPDATE telefones
       SET numero = TRIM(numero)
       WHERE numero != TRIM(numero)`
    );

    console.info('[telefones] Migrando valores legados de pessoas.telefone...');
    const legados = await db.all(
      `SELECT id, TRIM(telefone) AS telefone, COALESCE(criadoEm, ?) AS criadoEm
       FROM pessoas
       WHERE telefone IS NOT NULL AND TRIM(telefone) <> ''`,
      [agora]
    );

    let migrados = 0;
    for (const pessoa of legados) {
      // Ignora números já presentes na tabela dedicada para evitar conflitos de índice único
      const existe = await db.get(
        'SELECT 1 FROM telefones WHERE pessoa_id = ? AND LOWER(numero) = LOWER(?)',
        [pessoa.id, pessoa.telefone]
      );
      if (existe) continue;

      await db.run(
        `INSERT INTO telefones (id, pessoa_id, numero, criadoEm, atualizadoEm)
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)` ,
        [pessoa.id, pessoa.telefone, pessoa.criadoEm, agora]
      );
      migrados += 1;
    }

    await db.commit();

    const total = await db.get('SELECT COUNT(*) AS total FROM telefones');
    console.info(`[telefones] Duplicados removidos: ${deduplicados.changes || 0}`);
    console.info(`[telefones] Migrados do legado: ${migrados}`);
    console.info(`[telefones] Total após ajustes: ${total.total}`);
  } catch (erro) {
    await db.rollback();
    console.error('[telefones] Falha ao migrar telefones normalizados:', erro.message);
    process.exitCode = 1;
  }
})();
