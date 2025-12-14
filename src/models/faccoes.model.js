const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

// Modelo dedicado para facções/organizações criminosas.
class FaccaoModel {
  // Cria facção garantindo unicidade por nome ou sigla.
  static async create({ nome, sigla = null, descricao = null }) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const limpa = (valor) => (valor ? String(valor).trim() : null);

    const nomeLimpo = limpa(nome);
    const siglaLimpa = limpa(sigla);
    const descricaoLimpa = limpa(descricao);

    if (!nomeLimpo) {
      throw new Error('Nome da facção é obrigatório.');
    }

    const existente = await db.get(
      'SELECT * FROM faccoes WHERE LOWER(nome) = LOWER(?) OR (sigla IS NOT NULL AND LOWER(sigla) = LOWER(?))',
      [nomeLimpo, siglaLimpa || nomeLimpo]
    );
    if (existente) {
      return existente;
    }

    const faccao = {
      id: randomUUID(),
      nome: nomeLimpo,
      sigla: siglaLimpa,
      descricao: descricaoLimpa,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO faccoes (id, nome, sigla, descricao, criadoEm, atualizadoEm) VALUES (?, ?, ?, ?, ?, ?)`,
      [faccao.id, faccao.nome, faccao.sigla, faccao.descricao, faccao.criadoEm, faccao.atualizadoEm]
    );

    return faccao;
  }

  // Lista facções com filtro opcional por termo (nome ou sigla).
  static async findAll({ termo } = {}) {
    const db = await initDatabase();
    const filtros = [];
    const params = [];

    if (termo) {
      filtros.push('(LOWER(nome) LIKE ? OR LOWER(IFNULL(sigla, "")) LIKE ?)');
      const like = `%${String(termo).toLowerCase()}%`;
      params.push(like, like);
    }

    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    return db.all(`SELECT * FROM faccoes ${where} ORDER BY nome ASC`, params);
  }

  // Busca única pelo identificador.
  static async findById(id) {
    if (!id) return null;
    const db = await initDatabase();
    return db.get('SELECT * FROM faccoes WHERE id = ?', [id]);
  }

  // Localiza por nome ou sigla para evitar duplicidade no cadastro indireto
  static async findByNomeOuSigla(valor) {
    if (!valor) return null;
    const db = await initDatabase();
    const termo = String(valor).trim();
    return db.get(
      'SELECT * FROM faccoes WHERE LOWER(nome) = LOWER(?) OR LOWER(IFNULL(sigla, "")) = LOWER(?)',
      [termo, termo]
    );
  }
}

module.exports = FaccaoModel;
