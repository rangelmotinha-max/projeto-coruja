const { initDatabase } = require('../database/sqlite');

// Modelo dedicado aos veículos vinculados a entidades
class VeiculoEntidadeModel {
  // Lista todos os veículos vinculados a entidades
  static async findAll() {
    const db = await initDatabase();
    return db.all('SELECT * FROM veiculos_entidades ORDER BY atualizadoEm DESC');
  }

  // Busca veículos de entidades com filtros flexíveis
  static async search(filtros = {}) {
    const db = await initDatabase();
    const clausulas = [];
    const valores = [];

    if (filtros.placa) {
      clausulas.push('placa = ?');
      valores.push(filtros.placa);
    }
    if (filtros.cpf) {
      // Comentário: CPF representa o CNPJ para veículos de entidade.
      clausulas.push('cnpj = ?');
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
      `SELECT placa, marcaModelo, nomeProprietario, cnpj, cor, anoModelo, obs FROM veiculos_entidades ${where} ORDER BY atualizadoEm DESC`,
      valores,
    );
  }
}

module.exports = VeiculoEntidadeModel;
