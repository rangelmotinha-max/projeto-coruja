const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

// Modelo responsável por persistir e recuperar registros de pessoas.
class PessoaModel {
  // Criação de nova pessoa com preenchimento automático de campos auditáveis.
  static async create(dados) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const pessoa = {
      id: randomUUID(),
      nomeCompleto: dados.nomeCompleto,
      dataNascimento: dados.dataNascimento,
      cpf: dados.cpf || null,
      rg: dados.rg || null,
      cnh: dados.cnh || null,
      nomeMae: dados.nomeMae || null,
      nomePai: dados.nomePai || null,
      telefone: dados.telefone || null,
      ultimoUf: dados.ultimoUf || null,
      ultimoLogradouro: dados.ultimoLogradouro || null,
      ultimoBairroCidade: dados.ultimoBairroCidade || null,
      ultimoCep: dados.ultimoCep || null,
      enderecoUf: dados.enderecoUf || null,
      enderecoLogradouro: dados.enderecoLogradouro || null,
      enderecoBairroCidade: dados.enderecoBairroCidade || null,
      enderecoCep: dados.enderecoCep || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO pessoas (
        id, nomeCompleto, dataNascimento, cpf, rg, cnh, nomeMae, nomePai, telefone,
        ultimoUf, ultimoLogradouro, ultimoBairroCidade, ultimoCep,
        enderecoUf, enderecoLogradouro, enderecoBairroCidade, enderecoCep,
        criadoEm, atualizadoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pessoa.id,
        pessoa.nomeCompleto,
        pessoa.dataNascimento,
        pessoa.cpf,
        pessoa.rg,
        pessoa.cnh,
        pessoa.nomeMae,
        pessoa.nomePai,
        pessoa.telefone,
        pessoa.ultimoUf,
        pessoa.ultimoLogradouro,
        pessoa.ultimoBairroCidade,
        pessoa.ultimoCep,
        pessoa.enderecoUf,
        pessoa.enderecoLogradouro,
        pessoa.enderecoBairroCidade,
        pessoa.enderecoCep,
        pessoa.criadoEm,
        pessoa.atualizadoEm,
      ]
    );

    return { ...pessoa };
  }

  // Retorna todas as pessoas cadastradas.
  static async findAll() {
    const db = await initDatabase();
    const pessoas = await db.all('SELECT * FROM pessoas');
    return pessoas.map((pessoa) => ({ ...pessoa }));
  }

  // Busca pessoa por ID.
  static async findById(id) {
    const db = await initDatabase();
    return db.get('SELECT * FROM pessoas WHERE id = ?', [id]);
  }

  // Atualiza campos informados para o registro.
  static async update(id, updates) {
    const db = await initDatabase();
    const campos = [];
    const valores = [];

    const colunasPermitidas = [
      'nomeCompleto',
      'dataNascimento',
      'cpf',
      'rg',
      'cnh',
      'nomeMae',
      'nomePai',
      'telefone',
      'ultimoUf',
      'ultimoLogradouro',
      'ultimoBairroCidade',
      'ultimoCep',
      'enderecoUf',
      'enderecoLogradouro',
      'enderecoBairroCidade',
      'enderecoCep',
    ];

    colunasPermitidas.forEach((coluna) => {
      if (updates[coluna] !== undefined) {
        campos.push(`${coluna} = ?`);
        valores.push(updates[coluna]);
      }
    });

    // Atualiza a coluna de auditoria para refletir a alteração.
    campos.push('atualizadoEm = ?');
    valores.push(new Date().toISOString());
    valores.push(id);

    const resultado = await db.run(`UPDATE pessoas SET ${campos.join(', ')} WHERE id = ?`, valores);
    if (!resultado.changes) return null;
    return this.findById(id);
  }

  // Remove o registro informado.
  static async delete(id) {
    const db = await initDatabase();
    const resultado = await db.run('DELETE FROM pessoas WHERE id = ?', [id]);
    return resultado.changes > 0;
  }
}

module.exports = PessoaModel;
