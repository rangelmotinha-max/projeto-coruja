const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

// Converte o caminho salvo no banco para uma URL pública servida pelo Express.
function gerarUrlPublica(caminhoRelativo) {
  if (!caminhoRelativo) return null;
  const normalizado = caminhoRelativo.replace(/\\/g, '/');
  return `/${normalizado.replace(/^\//, '')}`;
}

// Modelo responsável pela persistência dos veículos.
class VeiculoModel {
  // Cria um novo veículo e retorna o registro completo.
  static async create(dados) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const veiculo = {
      id: randomUUID(),
      proprietario: dados.proprietario,
      cpf: dados.cpf,
      marcaModelo: dados.marcaModelo || null,
      placa: dados.placa || null,
      cor: dados.cor || null,
      anoModelo: dados.anoModelo || null,
      foto_caminho: dados.foto?.caminho || null,
      foto_nome: dados.foto?.nomeOriginal || null,
      foto_mime: dados.foto?.mimeType || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO veiculos (
        id, proprietario, cpf, marcaModelo, placa, cor, anoModelo,
        foto_caminho, foto_nome, foto_mime, criadoEm, atualizadoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        veiculo.id,
        veiculo.proprietario,
        veiculo.cpf,
        veiculo.marcaModelo,
        veiculo.placa,
        veiculo.cor,
        veiculo.anoModelo,
        veiculo.foto_caminho,
        veiculo.foto_nome,
        veiculo.foto_mime,
        veiculo.criadoEm,
        veiculo.atualizadoEm,
      ],
    );

    return this.findById(veiculo.id);
  }

  // Retorna todos os veículos cadastrados.
  static async findAll() {
    const db = await initDatabase();
    const registros = await db.all('SELECT * FROM veiculos ORDER BY criadoEm DESC');
    return registros.map((row) => this.mapRow(row));
  }

  // Busca um veículo específico.
  static async findById(id) {
    const db = await initDatabase();
    const registro = await db.get('SELECT * FROM veiculos WHERE id = ?', [id]);
    return registro ? this.mapRow(registro) : null;
  }

  // Mapeia o registro do banco para o formato esperado pela API.
  static mapRow(row) {
    return {
      ...row,
      fotoUrl: gerarUrlPublica(row.foto_caminho),
    };
  }
}

module.exports = VeiculoModel;
