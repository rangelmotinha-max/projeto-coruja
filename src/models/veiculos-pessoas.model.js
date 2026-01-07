const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

// Modelo dedicado à tabela veiculos_pessoas, isolando vínculos ao cadastro de pessoas
class VeiculoPessoaModel {
  // Cria um veículo associado a uma pessoa específica
  static async create(dados, dbArg) {
    const db = dbArg || await initDatabase();
    const agora = new Date().toISOString();
    const id = randomUUID();

    await db.run(
      `INSERT INTO veiculos_pessoas (
        id, pessoa_id, nomeProprietario, cpf, placa, marcaModelo, cor, anoModelo, criadoEm, atualizadoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dados.pessoaId,
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

    return this.findById(id);
  }

  // Recupera um veículo vinculado pela chave primária
  static async findById(id, dbArg) {
    const db = dbArg || await initDatabase();
    return db.get('SELECT * FROM veiculos_pessoas WHERE id = ?', [id]);
  }

  // Lista todos os veículos de uma pessoa ordenados por atualização
  static async findAllByPessoaId(pessoaId, dbArg) {
    if (!pessoaId) return [];
    const db = dbArg || await initDatabase();
    return db.all(
      'SELECT * FROM veiculos_pessoas WHERE pessoa_id = ? ORDER BY atualizadoEm DESC',
      [pessoaId],
    );
  }

  // Busca um veículo específico pela placa dentro do contexto da pessoa
  static async findByPlaca(pessoaId, placa, dbArg) {
    if (!pessoaId || !placa) return null;
    const db = dbArg || await initDatabase();
    return db.get(
      'SELECT * FROM veiculos_pessoas WHERE pessoa_id = ? AND placa = ? ORDER BY atualizadoEm DESC',
      [pessoaId, placa],
    );
  }

  // Busca um veículo pelo CPF do titular dentro do escopo da pessoa
  static async findByCpf(pessoaId, cpf, dbArg) {
    if (!pessoaId || !cpf) return null;
    const db = dbArg || await initDatabase();
    return db.get(
      'SELECT * FROM veiculos_pessoas WHERE pessoa_id = ? AND cpf = ? ORDER BY atualizadoEm DESC',
      [pessoaId, cpf],
    );
  }

  // Busca um veículo pelo nome do proprietário para cenários sem documento
  static async findByNomeProprietario(pessoaId, nomeProprietario, dbArg) {
    if (!pessoaId || !nomeProprietario) return null;
    const db = dbArg || await initDatabase();
    return db.get(
      'SELECT * FROM veiculos_pessoas WHERE pessoa_id = ? AND LOWER(nomeProprietario) = LOWER(?) ORDER BY atualizadoEm DESC',
      [pessoaId, nomeProprietario],
    );
  }

  // Consulta veículos vinculados com filtros para composição de buscas globais
  static async search(filtros = {}, dbArg) {
    const db = dbArg || await initDatabase();
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
      `SELECT placa, marcaModelo, nomeProprietario, cpf, cor, anoModelo FROM veiculos_pessoas ${where} ORDER BY atualizadoEm DESC`,
      valores,
    );
  }

  // Atualiza os campos editáveis de um veículo vinculado
  static async update(id, updates, dbArg) {
    const db = dbArg || await initDatabase();
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

    const resultado = await db.run(`UPDATE veiculos_pessoas SET ${campos.join(', ')} WHERE id = ?`, valores);
    if (!resultado.changes) return null;
    return this.findById(id);
  }

  // Remove um veículo específico
  static async delete(id, dbArg) {
    const db = dbArg || await initDatabase();
    const resultado = await db.run('DELETE FROM veiculos_pessoas WHERE id = ?', [id]);
    return resultado.changes > 0;
  }
}

module.exports = VeiculoPessoaModel;
