const { initDatabase } = require('../database/sqlite');

// Modelo dedicado aos veículos vinculados a empresas
class VeiculoEmpresaModel {
  // Lista todos os veículos vinculados a empresas
  static async findAll() {
    const db = await initDatabase();
    return db.all('SELECT * FROM veiculos_empresas ORDER BY atualizadoEm DESC');
  }

  // Busca veículos de empresas com filtros flexíveis
  static async search(filtros = {}) {
    const db = await initDatabase();
    const clausulas = [];
    const valores = [];

    if (filtros.placa) {
      clausulas.push('placa = ?');
      valores.push(filtros.placa);
    }
    if (filtros.cpf) {
      // Comentário: CPF representa o CNPJ para veículos de empresa.
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
      `SELECT placa, marcaModelo, nomeProprietario, cnpj, cor, anoModelo FROM veiculos_empresas ${where} ORDER BY atualizadoEm DESC`,
      valores,
    );
  }
}

module.exports = VeiculoEmpresaModel;
