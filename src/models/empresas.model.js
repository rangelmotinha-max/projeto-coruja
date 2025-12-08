const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

class EmpresaCatalogoModel {
  static async create(dados) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const id = randomUUID();
    const empresa = {
      id,
      cnpj: (dados.cnpj || null),
      razaoSocial: dados.razaoSocial || null,
      nomeFantasia: dados.nomeFantasia || null,
      naturezaJuridica: dados.naturezaJuridica || null,
      dataInicioAtividade: dados.dataInicioAtividade || null,
      situacaoCadastral: dados.situacaoCadastral || null,
      endereco: dados.endereco || null,
      cep: dados.cep || null,
      telefone: dados.telefone || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO empresas_cadastro (
        id, cnpj, razaoSocial, nomeFantasia, naturezaJuridica, dataInicioAtividade,
        situacaoCadastral, endereco, cep, telefone, criadoEm, atualizadoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresa.id,
        empresa.cnpj,
        empresa.razaoSocial,
        empresa.nomeFantasia,
        empresa.naturezaJuridica,
        empresa.dataInicioAtividade,
        empresa.situacaoCadastral,
        empresa.endereco,
        empresa.cep,
        empresa.telefone,
        empresa.criadoEm,
        empresa.atualizadoEm,
      ]
    );

    if (Array.isArray(dados.socios)) {
      for (const s of dados.socios) {
        const socioId = randomUUID();
        await db.run(
          `INSERT INTO socios_cadastro (id, empresa_id, nome, cpf, criadoEm, atualizadoEm)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [socioId, empresa.id, s.nome || null, s.cpf || null, agora, agora]
        );
      }
    }

    return this.findById(id);
  }

  static async findAll() {
    const db = await initDatabase();
    const empresas = await db.all('SELECT * FROM empresas_cadastro ORDER BY atualizadoEm DESC');
    for (const e of empresas) {
      e.socios = await db.all('SELECT id, nome, cpf FROM socios_cadastro WHERE empresa_id = ? ORDER BY criadoEm ASC', [e.id]);
    }
    return empresas;
  }

  static async findById(id) {
    const db = await initDatabase();
    const e = await db.get('SELECT * FROM empresas_cadastro WHERE id = ?', [id]);
    if (!e) return null;
    e.socios = await db.all('SELECT id, nome, cpf FROM socios_cadastro WHERE empresa_id = ? ORDER BY criadoEm ASC', [id]);
    return e;
  }

  static async update(id, updates) {
    const db = await initDatabase();
    const campos = [];
    const valores = [];
    const permitidas = [
      'cnpj','razaoSocial','nomeFantasia','naturezaJuridica','dataInicioAtividade',
      'situacaoCadastral','endereco','cep','telefone'
    ];
    permitidas.forEach((c) => {
      if (updates[c] !== undefined) { campos.push(`${c} = ?`); valores.push(updates[c]); }
    });
    campos.push('atualizadoEm = ?');
    valores.push(new Date().toISOString());
    valores.push(id);
    const r = await db.run(`UPDATE empresas_cadastro SET ${campos.join(', ')} WHERE id = ?`, valores);
    if (!r.changes) return null;

    if (Array.isArray(updates.socios)) {
      const atuais = await db.all('SELECT id FROM socios_cadastro WHERE empresa_id = ?', [id]);
      for (const s of atuais) { await db.run('DELETE FROM socios_cadastro WHERE id = ?', [s.id]); }
      const agora = new Date().toISOString();
      for (const s of updates.socios) {
        const socioId = randomUUID();
        await db.run(
          `INSERT INTO socios_cadastro (id, empresa_id, nome, cpf, criadoEm, atualizadoEm)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [socioId, id, s.nome || null, s.cpf || null, agora, agora]
        );
      }
    }

    return this.findById(id);
  }

  static async delete(id) {
    const db = await initDatabase();
    const r = await db.run('DELETE FROM empresas_cadastro WHERE id = ?', [id]);
    return r.changes > 0;
  }
}

module.exports = EmpresaCatalogoModel;
