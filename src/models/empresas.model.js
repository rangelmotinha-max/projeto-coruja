const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

class EmpresaCatalogoModel {
  static async _listarVeiculos(db, empresaId) {
    return db.all(
      'SELECT id, nomeProprietario, cnpj, placa, marcaModelo, cor, anoModelo, criadoEm, atualizadoEm FROM veiculos_empresas WHERE empresa_id = ? ORDER BY atualizadoEm DESC',
      [empresaId]
    );
  }

  static async _salvarVeiculos(db, empresaId, veiculos) {
    if (!Array.isArray(veiculos) || veiculos.length === 0) return;
    const agora = new Date().toISOString();
    for (const v of veiculos) {
      const id = v.id || randomUUID();
      await db.run(
        `INSERT INTO veiculos_empresas (id, empresa_id, nomeProprietario, cnpj, placa, marcaModelo, cor, anoModelo, criadoEm, atualizadoEm)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          empresaId,
          v.nomeProprietario || null,
          v.cnpj || null,
          v.placa || null,
          v.marcaModelo || null,
          v.cor || null,
          typeof v.anoModelo === 'number' ? v.anoModelo : null,
          agora,
          agora,
        ]
      );
    }
  }

  static async _removerVeiculos(db, empresaId) {
    await db.run('DELETE FROM veiculos_empresas WHERE empresa_id = ?', [empresaId]);
  }
  static async _listarEnderecos(db, empresaId) {
    return db.all(
      'SELECT id, uf, logradouro, bairro, cep, complemento, lat_long as latLong, criadoEm, atualizadoEm FROM empresas_enderecos WHERE empresa_id = ? ORDER BY atualizadoEm DESC',
      [empresaId]
    );
  }

  static async _salvarEnderecos(db, empresaId, enderecos) {
    if (!Array.isArray(enderecos) || enderecos.length === 0) return;
    const agora = new Date().toISOString();
    for (const e of enderecos) {
      const id = e.id || randomUUID();
      await db.run(
        `INSERT INTO empresas_enderecos (id, empresa_id, uf, logradouro, bairro, cep, complemento, lat_long, criadoEm, atualizadoEm)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          empresaId,
          e.uf || null,
          e.logradouro || null,
          e.bairro || null,
          e.cep || null,
          e.complemento || null,
          e.latLong || null,
          agora,
          agora,
        ]
      );
    }
  }

  static async _removerEnderecos(db, empresaId) {
    await db.run('DELETE FROM empresas_enderecos WHERE empresa_id = ?', [empresaId]);
  }
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

    if (Array.isArray(dados.enderecos) && dados.enderecos.length) {
      await this._salvarEnderecos(db, empresa.id, dados.enderecos);
    }

    if (Array.isArray(dados.veiculos) && dados.veiculos.length) {
      await this._salvarVeiculos(db, empresa.id, dados.veiculos);
    }

    return this.findById(id);
  }

  static async findAll() {
    const db = await initDatabase();
    const empresas = await db.all('SELECT * FROM empresas_cadastro ORDER BY atualizadoEm DESC');
    for (const e of empresas) {
      e.socios = await db.all('SELECT id, nome, cpf FROM socios_cadastro WHERE empresa_id = ? ORDER BY criadoEm ASC', [e.id]);
      e.enderecos = await this._listarEnderecos(db, e.id);
      e.veiculos = await this._listarVeiculos(db, e.id);
    }
    return empresas;
  }

  static async findById(id) {
    const db = await initDatabase();
    const e = await db.get('SELECT * FROM empresas_cadastro WHERE id = ?', [id]);
    if (!e) return null;
    e.socios = await db.all('SELECT id, nome, cpf FROM socios_cadastro WHERE empresa_id = ? ORDER BY criadoEm ASC', [id]);
    e.enderecos = await this._listarEnderecos(db, id);
    e.veiculos = await this._listarVeiculos(db, id);
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

    if (Array.isArray(updates.enderecos)) {
      await this._removerEnderecos(db, id);
      await this._salvarEnderecos(db, id, updates.enderecos);
    }

    if (Array.isArray(updates.veiculos)) {
      await this._removerVeiculos(db, id);
      await this._salvarVeiculos(db, id, updates.veiculos);
    }

    return this.findById(id);
  }

  static async delete(id) {
    const db = await initDatabase();
    await this._removerVeiculos(db, id);
    await this._removerEnderecos(db, id);
    const r = await db.run('DELETE FROM empresas_cadastro WHERE id = ?', [id]);
    return r.changes > 0;
  }
}

module.exports = EmpresaCatalogoModel;
