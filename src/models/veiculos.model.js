const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

// Modelo responsável por persistir e consultar veículos
class VeiculoModel {
  static async _listarEnderecos(db, veiculoId) {
    return db.all(
      'SELECT id, uf, logradouro, bairro, cep, complemento, lat_long as latLong, criadoEm, atualizadoEm FROM veiculos_enderecos WHERE veiculo_id = ? ORDER BY atualizadoEm DESC',
      [veiculoId],
    );
  }

  static async _salvarEnderecos(db, veiculoId, enderecos) {
    if (!Array.isArray(enderecos) || enderecos.length === 0) return;
    const agora = new Date().toISOString();
    for (const e of enderecos) {
      const eid = (e && e.id) ? String(e.id) : randomUUID();
      await db.run(
        `INSERT INTO veiculos_enderecos (id, veiculo_id, uf, logradouro, bairro, cep, complemento, lat_long, criadoEm, atualizadoEm)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eid,
          veiculoId,
          e.uf || null,
          e.logradouro || null,
          e.bairro || null,
          e.cep || null,
          e.complemento || null,
          e.latLong || null,
          agora,
          agora,
        ],
      );
    }
  }

  static async _removerEnderecos(db, veiculoId) {
    await db.run('DELETE FROM veiculos_enderecos WHERE veiculo_id = ?', [veiculoId]);
  }
  // Cria um novo registro de veículo
  static async create(dados) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const id = randomUUID();

    await db.run(
      `INSERT INTO veiculos (
        id, nomeProprietario, cpf, placa, marcaModelo, cor, anoModelo, criadoEm, atualizadoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dados.nomeProprietario,
        dados.cpf || null,
        dados.placa,
        dados.marcaModelo || null,
        dados.cor || null,
        dados.anoModelo ?? null,
        agora,
        agora,
      ],
    );
    if (Array.isArray(dados.enderecos) && dados.enderecos.length) {
      await this._salvarEnderecos(db, id, dados.enderecos);
    }
    const veiculo = await this.findById(id);
    return veiculo;
  }

  // Lista todos os veículos ordenados por atualização
  static async findAll() {
    const db = await initDatabase();
    return db.all('SELECT * FROM veiculos ORDER BY atualizadoEm DESC');
  }

  // Busca veículos com filtros flexíveis para consultas combinadas
  static async search(filtros = {}) {
    const db = await initDatabase();
    const clausulas = [];
    const valores = [];

    if (filtros.placa) {
      clausulas.push('placa = ?');
      valores.push(filtros.placa);
    }
    if (filtros.cpf) {
      clausulas.push('cpf = ?');
      valores.push(filtros.cpf);
    }
    if (filtros.nomeProprietario) {
      clausulas.push('LOWER(nomeProprietario) LIKE LOWER(?)');
      valores.push(`%${filtros.nomeProprietario}%`);
    }
    if (filtros.marcaModelo) {
      clausulas.push('LOWER(marcaModelo) LIKE LOWER(?)');
      valores.push(`%${filtros.marcaModelo}%`);
    }

    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';

    return db.all(
      `SELECT placa, marcaModelo, nomeProprietario, cpf FROM veiculos ${where} ORDER BY atualizadoEm DESC`,
      valores,
    );
  }

  // Busca veículo específico pelo identificador
  static async findById(id) {
    const db = await initDatabase();
    const v = await db.get('SELECT * FROM veiculos WHERE id = ?', [id]);
    if (!v) return null;
    const enderecos = await this._listarEnderecos(db, id);
    return { ...v, enderecos };
  }

  // Recupera veículo pelo CPF do proprietário para permitir vínculo com pessoas
  static async findByCpf(cpf) {
    if (!cpf) return null;
    const db = await initDatabase();
    return db.get('SELECT * FROM veiculos WHERE cpf = ? ORDER BY atualizadoEm DESC', [cpf]);
  }

  // Recupera todos os veículos vinculados a um CPF
  static async findAllByCpf(cpf) {
    if (!cpf) return [];
    const db = await initDatabase();
    return db.all('SELECT * FROM veiculos WHERE cpf = ? ORDER BY atualizadoEm DESC', [cpf]);
  }

  // Recupera veículo pela placa quando não houver CPF disponível
  static async findByPlaca(placa) {
    if (!placa) return null;
    const db = await initDatabase();
    return db.get('SELECT * FROM veiculos WHERE placa = ? ORDER BY atualizadoEm DESC', [placa]);
  }

  // Recupera veículo pelo nome do proprietário para cenários sem CPF definido
  static async findByNomeProprietario(nomeProprietario) {
    if (!nomeProprietario) return null;
    const db = await initDatabase();
    return db.get(
      'SELECT * FROM veiculos WHERE LOWER(nomeProprietario) = LOWER(?) ORDER BY atualizadoEm DESC',
      [nomeProprietario],
    );
  }

  // Lista todos os veículos associados a um nome de proprietário
  static async findAllByNomeProprietario(nomeProprietario) {
    if (!nomeProprietario) return [];
    const db = await initDatabase();
    return db.all(
      'SELECT * FROM veiculos WHERE LOWER(nomeProprietario) = LOWER(?) ORDER BY atualizadoEm DESC',
      [nomeProprietario],
    );
  }

  // Atualiza campos permitidos de um veículo
  static async update(id, updates) {
    const db = await initDatabase();
    const campos = [];
    const valores = [];

    const permitidos = ['nomeProprietario', 'cpf', 'placa', 'marcaModelo', 'cor', 'anoModelo'];
    permitidos.forEach((campo) => {
      if (updates[campo] !== undefined) {
        campos.push(`${campo} = ?`);
        valores.push(updates[campo]);
      }
    });

    campos.push('atualizadoEm = ?');
    valores.push(new Date().toISOString());
    valores.push(id);

    const resultado = await db.run(`UPDATE veiculos SET ${campos.join(', ')} WHERE id = ?`, valores);
    if (!resultado.changes) return null;
    // Se enviado um array de enderecos, substitui os atuais por novos
    if (Array.isArray(updates.enderecos)) {
      await this._removerEnderecos(db, id);
      await this._salvarEnderecos(db, id, updates.enderecos);
    }
    return this.findById(id);
  }

  // Remove um registro pelo ID
  static async delete(id) {
    const db = await initDatabase();
    const resultado = await db.run('DELETE FROM veiculos WHERE id = ?', [id]);
    return resultado.changes > 0;
  }
}

module.exports = VeiculoModel;
