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
      dataNascimento: dados.dataNascimento || null,
      cpf: dados.cpf || null,
      rg: dados.rg || null,
      cnh: dados.cnh || null,
      nomeMae: dados.nomeMae || null,
      nomePai: dados.nomePai || null,
      endereco_atual_index: dados.endereco_atual_index || 0,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO pessoas (
        id, nomeCompleto, dataNascimento, cpf, rg, cnh, nomeMae, nomePai,
        endereco_atual_index, criadoEm, atualizadoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pessoa.id,
        pessoa.nomeCompleto,
        pessoa.dataNascimento,
        pessoa.cpf,
        pessoa.rg,
        pessoa.cnh,
        pessoa.nomeMae,
        pessoa.nomePai,
        pessoa.endereco_atual_index,
        pessoa.criadoEm,
        pessoa.atualizadoEm,
      ]
    );

    // Salvar endereços se fornecidos
    if (dados.enderecos && Array.isArray(dados.enderecos)) {
      for (const endereco of dados.enderecos) {
        await this.adicionarEndereco(pessoa.id, endereco);
      }
    }

    // Salvar telefones se fornecidos
    if (dados.telefones && Array.isArray(dados.telefones)) {
      for (const telefone of dados.telefones) {
        if (telefone.trim()) {
          await this.adicionarTelefone(pessoa.id, telefone);
        }
      }
    }

    return { ...pessoa, enderecos: [], telefones: [] };
  }

  // Retorna todas as pessoas cadastradas com seus endereços e telefones.
  static async findAll() {
    const db = await initDatabase();
    const pessoas = await db.all('SELECT * FROM pessoas');
    
    // Buscar endereços e telefones para cada pessoa
    for (const pessoa of pessoas) {
      pessoa.enderecos = await this.obterEnderecosPorPessoa(pessoa.id);
      pessoa.telefones = (await this.obterTelefonesPorPessoa(pessoa.id)).map(t => t.numero);
    }
    
    return pessoas;
  }

  // Busca pessoa por ID com todos seus endereços e telefones.
  static async findById(id) {
    const db = await initDatabase();
    const pessoa = await db.get('SELECT * FROM pessoas WHERE id = ?', [id]);
    
    if (pessoa) {
      pessoa.enderecos = await this.obterEnderecosPorPessoa(id);
      pessoa.telefones = (await this.obterTelefonesPorPessoa(id)).map(t => t.numero);
    }
    
    return pessoa;
  }

  // Obtém todos os endereços de uma pessoa
  static async obterEnderecosPorPessoa(pessoaId) {
    const db = await initDatabase();
    return db.all(
      'SELECT id, uf, logradouro, bairro, complemento, cep FROM enderecos WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  // Adiciona um novo endereço para uma pessoa
  static async adicionarEndereco(pessoaId, endereco) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    
    const novoEndereco = {
      id: randomUUID(),
      pessoa_id: pessoaId,
      uf: endereco.uf || null,
      logradouro: endereco.logradouro || null,
      bairro: endereco.bairro || null,
      // Complemento agora é salvo para permitir recuperar o campo na edição.
      complemento: endereco.complemento || null,
      cep: endereco.cep || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO enderecos (id, pessoa_id, uf, logradouro, bairro, complemento, cep, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        novoEndereco.id,
        novoEndereco.pessoa_id,
        novoEndereco.uf,
        novoEndereco.logradouro,
        novoEndereco.bairro,
        novoEndereco.complemento,
        novoEndereco.cep,
        novoEndereco.criadoEm,
        novoEndereco.atualizadoEm,
      ]
    );

    return novoEndereco;
  }

  // Atualiza um endereço específico
  static async atualizarEndereco(enderecoId, updates) {
    const db = await initDatabase();
    const campos = [];
    const valores = [];

    const colunasPermitidas = ['uf', 'logradouro', 'bairro', 'complemento', 'cep'];

    colunasPermitidas.forEach((coluna) => {
      if (updates[coluna] !== undefined) {
        campos.push(`${coluna} = ?`);
        valores.push(updates[coluna]);
      }
    });

    campos.push('atualizadoEm = ?');
    valores.push(new Date().toISOString());
    valores.push(enderecoId);

    const resultado = await db.run(`UPDATE enderecos SET ${campos.join(', ')} WHERE id = ?`, valores);
    return resultado.changes > 0;
  }

  // Remove um endereço específico
  static async removerEndereco(enderecoId) {
    const db = await initDatabase();
    const resultado = await db.run('DELETE FROM enderecos WHERE id = ?', [enderecoId]);
    return resultado.changes > 0;
  }

  // Obtém todos os telefones de uma pessoa
  static async obterTelefonesPorPessoa(pessoaId) {
    const db = await initDatabase();
    return db.all(
      'SELECT id, numero FROM telefones WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  // Adiciona um novo telefone para uma pessoa
  static async adicionarTelefone(pessoaId, numero) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    
    const novoTelefone = {
      id: randomUUID(),
      pessoa_id: pessoaId,
      numero: numero,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO telefones (id, pessoa_id, numero, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?)`,
      [novoTelefone.id, novoTelefone.pessoa_id, novoTelefone.numero, novoTelefone.criadoEm, novoTelefone.atualizadoEm]
    );

    return novoTelefone;
  }

  // Atualiza um telefone específico
  static async atualizarTelefone(telefoneId, numero) {
    const db = await initDatabase();
    const agora = new Date().toISOString();

    const resultado = await db.run(
      `UPDATE telefones SET numero = ?, atualizadoEm = ? WHERE id = ?`,
      [numero, agora, telefoneId]
    );

    return resultado.changes > 0;
  }

  // Remove um telefone específico
  static async removerTelefone(telefoneId) {
    const db = await initDatabase();
    const resultado = await db.run('DELETE FROM telefones WHERE id = ?', [telefoneId]);
    return resultado.changes > 0;
  }

  // Atualiza campos da pessoa (dados pessoais)
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
      'endereco_atual_index',
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

  // Remove o registro informado (cascata remove endereços também).
  static async delete(id) {
    const db = await initDatabase();
    const resultado = await db.run('DELETE FROM pessoas WHERE id = ?', [id]);
    return resultado.changes > 0;
  }
}

module.exports = PessoaModel;
