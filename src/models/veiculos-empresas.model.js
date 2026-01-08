const { initDatabase } = require('../database/sqlite');

// Modelo dedicado à consulta de veículos vinculados a empresas
class VeiculoEmpresaModel {
  // Busca veículos de empresas com filtros compatíveis com a busca de veículos
  static async search(filtros = {}) {
    const db = await initDatabase();
    const clausulas = [];
    const valores = [];

    if (filtros.placa) {
      clausulas.push('placa = ?');
      valores.push(filtros.placa);
    }

    const documento = filtros.cnpj || filtros.cpf;
    if (documento) {
      clausulas.push('cnpj = ?');
      valores.push(documento);
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
