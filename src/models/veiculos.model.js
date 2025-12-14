const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

// Modelo responsável por persistir e consultar veículos
class VeiculoModel {
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

    return this.findById(id);
  }

  // Lista todos os veículos ordenados por atualização
  static async findAll() {
    const db = await initDatabase();
    return db.all('SELECT * FROM veiculos ORDER BY atualizadoEm DESC');
  }

  // Busca veículo específico pelo identificador
  static async findById(id) {
    const db = await initDatabase();
    return db.get('SELECT * FROM veiculos WHERE id = ?', [id]);
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
