const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

// Normaliza CPF/CNPJ e outros numéricos mantendo apenas dígitos.
const somenteDigitos = (valor) => String(valor || '').replace(/\D/g, '');

function calcularIdadeDe(dataStr) {
  if (!dataStr) return null;
  const parts = String(dataStr).split('-');
  if (parts.length !== 3) return null;
  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);
  if ([ano, mes, dia].some((n) => Number.isNaN(n))) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario = (hoje.getMonth() < mes) || (hoje.getMonth() === mes && hoje.getDate() < dia);
  if (aindaNaoFezAniversario) idade -= 1;
  return idade >= 0 ? idade : 0;
}

// Diretório público onde as fotos ficam acessíveis via servidor estático
const publicDir = path.join(__dirname, '../../public');

// Gera a URL acessível a partir do caminho salvo no banco.
function gerarUrlPublica(caminhoRelativo) {
  if (!caminhoRelativo) return null;
  const normalizado = caminhoRelativo.replace(/\\/g, '/');
  return `/${normalizado.replace(/^\//, '')}`;
}

// Remove o arquivo físico, mas não interrompe o fluxo se algo falhar.
function removerArquivoFisico(caminhoRelativo) {
  if (!caminhoRelativo) return;
  const absoluto = path.join(publicDir, caminhoRelativo);
  fs.promises.unlink(absoluto).catch(() => {});
}

// Modelo responsável por persistir e recuperar registros de pessoas.
class PessoaModel {
  // Criação de nova pessoa com preenchimento automático de campos auditáveis.
  static async create(dados) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const pessoa = {
      id: randomUUID(),
      nomeCompleto: dados.nomeCompleto,
      apelido: dados.apelido || null,
      // Mantém string vazia quando fornecida para evitar NOT NULL em bancos antigos
      dataNascimento: dados.dataNascimento === undefined ? null : dados.dataNascimento,
      idade: calcularIdadeDe(dados.dataNascimento) ?? (typeof dados.idade === 'number' ? dados.idade : null),
      cpf: dados.cpf || null,
      rg: dados.rg || null,
      cnh: dados.cnh || null,
      nomeMae: dados.nomeMae || null,
      nomePai: dados.nomePai || null,
      endereco_atual_index: dados.endereco_atual_index || 0,
      vinculos_json: dados.vinculos ? JSON.stringify(dados.vinculos) : null,
      ocorrencias_json: dados.ocorrencias ? JSON.stringify(dados.ocorrencias) : null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO pessoas (
        id, nomeCompleto, apelido, dataNascimento, idade, cpf, rg, cnh, nomeMae, nomePai,
        endereco_atual_index, vinculos_json, ocorrencias_json, criadoEm, atualizadoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pessoa.id,
        pessoa.nomeCompleto,
        pessoa.apelido,
        pessoa.dataNascimento,
        pessoa.idade,
        pessoa.cpf,
        pessoa.rg,
        pessoa.cnh,
        pessoa.nomeMae,
        pessoa.nomePai,
        pessoa.endereco_atual_index,
        pessoa.vinculos_json,
        pessoa.ocorrencias_json,
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

    // Salvar emails se fornecidos
    if (dados.emails && Array.isArray(dados.emails)) {
      for (const email of dados.emails) {
        if (email.trim()) {
          await this.adicionarEmail(pessoa.id, email);
        }
      }
    }

    // Salvar redes sociais se fornecidas
    if (dados.redesSociais && Array.isArray(dados.redesSociais)) {
      for (const perfil of dados.redesSociais) {
        if (perfil.trim()) {
          await this.adicionarRedeSocial(pessoa.id, perfil);
        }
      }
    }

    // Salvar empresa e sócios se fornecidos
    if (dados.empresa && typeof dados.empresa === 'object') {
      await this.upsertEmpresa(pessoa.id, dados.empresa);
    }

    // Salvar veículos se fornecidos
    if (dados.veiculos && Array.isArray(dados.veiculos)) {
      for (const v of dados.veiculos) {
        const mm = (v.marcaModelo || '').trim();
        const pl = (v.placa || '').trim();
        const cr = (v.cor || '').trim();
        const am = (v.anoModelo || '').trim();
        if (mm || pl || cr || am) {
          // Vincula sempre ao proprietário correspondente aos dados da pessoa
          await this.adicionarVeiculo(pessoa.id, v, {
            nome: pessoa.nomeCompleto,
            cpf: pessoa.cpf,
          });
        }
      }
    }

    // Vincular veículos já cadastrados via busca por placa
    if (dados.vinculos && Array.isArray(dados.vinculos.veiculos)) {
      const veiculosComId = dados.vinculos.veiculos.filter((v) => v.id);
      if (veiculosComId.length) {
        await this.vincularVeiculosExistentes(
          pessoa.id,
          veiculosComId.map((v) => v.id),
          pessoa.nomeCompleto,
          pessoa.cpf
        );
      }
    }

    // Salvar vínculos (pessoas relacionadas)
    if (dados.vinculos && Array.isArray(dados.vinculos.pessoas)) {
      for (const vp of dados.vinculos.pessoas) {
        if ((vp.nome||vp.cpf||vp.tipo||'').toString().trim().length) {
          await this.adicionarVinculoPessoa(pessoa.id, vp);
        }
      }
    }

    // Salvar fotos carregadas durante o cadastro
    if (dados.fotos && Array.isArray(dados.fotos)) {
      for (const foto of dados.fotos) {
        await this.adicionarFoto(pessoa.id, foto);
      }
    }

    return { ...pessoa, enderecos: [], telefones: [], emails: [], redesSociais: [], fotos: await this.obterFotosPorPessoa(pessoa.id) };
  }

  // Retorna todas as pessoas cadastradas com seus endereços e telefones.
  static async findAll() {
    const db = await initDatabase();
    const pessoas = await db.all('SELECT * FROM pessoas');

    // Buscar endereços e telefones para cada pessoa
    for (const pessoa of pessoas) {
      await this.hidratarPessoa(pessoa);
    }

    return pessoas;
  }

  // Busca pessoa por ID com todos seus endereços e telefones.
  static async findById(id) {
    const db = await initDatabase();
    const pessoa = await db.get('SELECT * FROM pessoas WHERE id = ?', [id]);

    if (pessoa) await this.hidratarPessoa(pessoa);

    return pessoa;
  }

  // Hidrata o objeto de pessoa com relacionamentos e campos derivados.
  static async hidratarPessoa(pessoa) {
    pessoa.enderecos = await this.obterEnderecosPorPessoa(pessoa.id);
    pessoa.telefones = (await this.obterTelefonesPorPessoa(pessoa.id)).map(t => t.numero);
    pessoa.emails = (await this.obterEmailsPorPessoa(pessoa.id)).map(e => e.email);
    pessoa.redesSociais = (await this.obterRedesPorPessoa(pessoa.id)).map(r => r.perfil);
    pessoa.fotos = await this.obterFotosPorPessoa(pessoa.id);
    pessoa.veiculos = await this.obterVeiculosPorPessoa(pessoa.id);
    pessoa.empresa = await this.obterEmpresaPorPessoa(pessoa.id);
    // Vinculos: preferir JSON quando existir, mas manter compatibilidade com tabela vinculos_pessoas
    let vinculosFromJson = {};
    if (pessoa.vinculos_json) {
      try {
        vinculosFromJson = JSON.parse(pessoa.vinculos_json) || {};
      } catch (_) {
        vinculosFromJson = {};
      }
    }
    const vinculosPessoas = await this.obterVinculosPessoas(pessoa.id);
    pessoa.vinculos = { pessoas: vinculosPessoas, ...vinculosFromJson };
    // Ocorrencias via JSON
    if (pessoa.ocorrencias_json) {
      try {
        pessoa.ocorrencias = JSON.parse(pessoa.ocorrencias_json) || {};
      } catch (_) {
        pessoa.ocorrencias = {};
      }
    } else {
      pessoa.ocorrencias = {};
    }
    return pessoa;
  }

  // Consulta pessoas aplicando filtros opcionais utilizando LIKE e subconsultas seguras.
  static async findByFilters(filtros = {}) {
    const db = await initDatabase();
    const where = ['1=1'];
    const params = [];

    // Filtro de nome completo ou apelido.
    if (filtros.nomeOuApelido) {
      where.push('(p.nomeCompleto LIKE ? OR p.apelido LIKE ?)');
      const termo = `%${filtros.nomeOuApelido}%`;
      params.push(termo, termo);
    }

    // Filtro por documento (CPF, RG ou CNH).
    if (filtros.documento) {
      where.push('(p.cpf LIKE ? OR p.rg LIKE ? OR p.cnh LIKE ?)');
      const termo = `%${filtros.documento}%`;
      params.push(termo, termo, termo);
    }

    // Filtro por data de nascimento.
    if (filtros.dataNascimento) {
      where.push('p.dataNascimento LIKE ?');
      params.push(`%${filtros.dataNascimento}%`);
    }

    // Filtro por nome da mãe.
    if (filtros.nomeMae) {
      where.push('p.nomeMae LIKE ?');
      params.push(`%${filtros.nomeMae}%`);
    }

    // Filtro por nome do pai.
    if (filtros.nomePai) {
      where.push('p.nomePai LIKE ?');
      params.push(`%${filtros.nomePai}%`);
    }

    // Filtro por telefone considerando coluna legado e tabela de telefones.
    if (filtros.telefone) {
      const termo = `%${filtros.telefone}%`;
      where.push('(p.telefone LIKE ? OR EXISTS (SELECT 1 FROM telefones t WHERE t.pessoa_id = p.id AND t.numero LIKE ?))');
      params.push(termo, termo);
    }

    // Filtro por email vinculado.
    if (filtros.email) {
      where.push('EXISTS (SELECT 1 FROM emails e WHERE e.pessoa_id = p.id AND e.email LIKE ?)');
      params.push(`%${filtros.email}%`);
    }

    const pessoas = await db.all(
      `SELECT DISTINCT p.* FROM pessoas p WHERE ${where.join(' AND ')} ORDER BY p.nomeCompleto ASC`,
      params
    );

    for (const pessoa of pessoas) {
      await this.hidratarPessoa(pessoa);
    }

    return pessoas;
  }

  // Obtém todos os endereços de uma pessoa
  static async obterEnderecosPorPessoa(pessoaId) {
    const db = await initDatabase();
    return db.all(
      // Retorna lat/long com alias em camelCase para o frontend
      'SELECT id, uf, logradouro, bairro, complemento, cep, lat_long AS latLong FROM enderecos WHERE pessoa_id = ? ORDER BY criadoEm ASC',
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
      // Armazena texto livre de latitude/longitude preenchido pelo usuário
      latLong: endereco.latLong || null,
      cep: endereco.cep || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO enderecos (id, pessoa_id, uf, logradouro, bairro, complemento, lat_long, cep, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        novoEndereco.id,
        novoEndereco.pessoa_id,
        novoEndereco.uf,
        novoEndereco.logradouro,
        novoEndereco.bairro,
        novoEndereco.complemento,
        novoEndereco.latLong,
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

    const colunasPermitidas = {
      uf: 'uf',
      logradouro: 'logradouro',
      bairro: 'bairro',
      complemento: 'complemento',
      cep: 'cep',
      // Mapeia propriedade camelCase para nome da coluna no banco
      latLong: 'lat_long',
    };

    Object.entries(colunasPermitidas).forEach(([campoPayload, colunaBanco]) => {
      if (updates[campoPayload] !== undefined) {
        campos.push(`${colunaBanco} = ?`);
        valores.push(updates[campoPayload]);
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

  // Emails
  static async obterEmailsPorPessoa(pessoaId) {
    const db = await initDatabase();
    return db.all(
      'SELECT id, email FROM emails WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  static async adicionarEmail(pessoaId, email) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const novo = {
      id: randomUUID(),
      pessoa_id: pessoaId,
      email,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await db.run(
      `INSERT INTO emails (id, pessoa_id, email, criadoEm, atualizadoEm) VALUES (?, ?, ?, ?, ?)` ,
      [novo.id, novo.pessoa_id, novo.email, novo.criadoEm, novo.atualizadoEm]
    );
    return novo;
  }

  static async removerEmail(emailId) {
    const db = await initDatabase();
    const resultado = await db.run('DELETE FROM emails WHERE id = ?', [emailId]);
    return resultado.changes > 0;
  }

  // Redes sociais
  static async obterRedesPorPessoa(pessoaId) {
    const db = await initDatabase();
    return db.all(
      'SELECT id, perfil FROM redes_sociais WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  static async adicionarRedeSocial(pessoaId, perfil) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const novo = {
      id: randomUUID(),
      pessoa_id: pessoaId,
      perfil,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await db.run(
      `INSERT INTO redes_sociais (id, pessoa_id, perfil, criadoEm, atualizadoEm) VALUES (?, ?, ?, ?, ?)` ,
      [novo.id, novo.pessoa_id, novo.perfil, novo.criadoEm, novo.atualizadoEm]
    );
    return novo;
  }

  static async removerRedeSocial(redeId) {
    const db = await initDatabase();
    const resultado = await db.run('DELETE FROM redes_sociais WHERE id = ?', [redeId]);
    return resultado.changes > 0;
  }

  // Fotos vinculadas a uma pessoa
  static async obterFotosPorPessoa(pessoaId) {
    const db = await initDatabase();
    const registros = await db.all(
      'SELECT id, nome_arquivo, caminho, mime_type AS mimeType, tamanho FROM fotos_pessoas WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
    return registros.map((foto) => ({ ...foto, url: gerarUrlPublica(foto.caminho) }));
  }

  static async adicionarFoto(pessoaId, foto) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const novaFoto = {
      id: randomUUID(),
      pessoa_id: pessoaId,
      nome_arquivo: foto.nomeOriginal || null,
      caminho: foto.caminho,
      mime_type: foto.mimeType || null,
      tamanho: foto.tamanho || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO fotos_pessoas (id, pessoa_id, nome_arquivo, caminho, mime_type, tamanho, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        novaFoto.id,
        novaFoto.pessoa_id,
        novaFoto.nome_arquivo,
        novaFoto.caminho,
        novaFoto.mime_type,
        novaFoto.tamanho,
        novaFoto.criadoEm,
        novaFoto.atualizadoEm,
      ]
    );

    return { ...novaFoto, url: gerarUrlPublica(novaFoto.caminho) };
  }

  static async removerFoto(fotoId) {
    const db = await initDatabase();
    const foto = await db.get('SELECT caminho FROM fotos_pessoas WHERE id = ?', [fotoId]);
    if (!foto) return false;

    const resultado = await db.run('DELETE FROM fotos_pessoas WHERE id = ?', [fotoId]);
    if (resultado.changes > 0) {
      removerArquivoFisico(foto.caminho);
    }
    return resultado.changes > 0;
  }

  static async removerFotosPorPessoa(pessoaId) {
    const fotos = await this.obterFotosPorPessoa(pessoaId);
    for (const foto of fotos) {
      await this.removerFoto(foto.id);
    }
  }

  // Veículos
  static async obterVeiculosPorPessoa(pessoaId) {
    const db = await initDatabase();
    return db.all(
      'SELECT id, marcaModelo, placa, cor, anoModelo, proprietario, cpfProprietario FROM veiculos WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  static async obterDadosProprietario(pessoaId, fallback = {}) {
    const db = await initDatabase();
    const pessoa = await db.get('SELECT nomeCompleto, cpf FROM pessoas WHERE id = ?', [pessoaId]);
    return {
      nome: fallback.nome ?? pessoa?.nomeCompleto ?? null,
      cpf: somenteDigitos(fallback.cpf ?? pessoa?.cpf ?? ''),
    };
  }

  static async adicionarVeiculo(pessoaId, veiculo, proprietarioInfo = {}) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const dadosProprietario = await this.obterDadosProprietario(pessoaId, proprietarioInfo);
    const novo = {
      id: randomUUID(),
      pessoa_id: pessoaId,
      proprietario: dadosProprietario.nome,
      cpfProprietario: dadosProprietario.cpf || null,
      marcaModelo: veiculo.marcaModelo || null,
      placa: veiculo.placa || null,
      cor: veiculo.cor || null,
      anoModelo: veiculo.anoModelo || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await db.run(
      `INSERT INTO veiculos (id, pessoa_id, proprietario, cpfProprietario, marcaModelo, placa, cor, anoModelo, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        novo.id,
        novo.pessoa_id,
        novo.proprietario,
        novo.cpfProprietario,
        novo.marcaModelo,
        novo.placa,
        novo.cor,
        novo.anoModelo,
        novo.criadoEm,
        novo.atualizadoEm,
      ]
    );
    return novo;
  }

  static async removerVeiculo(veiculoId) {
    const db = await initDatabase();
    const resultado = await db.run('DELETE FROM veiculos WHERE id = ?', [veiculoId]);
    return resultado.changes > 0;
  }

  static async vincularVeiculosExistentes(pessoaId, veiculoIds = [], nomeProprietario, cpfProprietario) {
    // Atualiza veículos já cadastrados para refletir vínculo com a pessoa atual
    if (!veiculoIds.length) return;
    const db = await initDatabase();
    const agora = new Date().toISOString();
    for (const veiculoId of veiculoIds) {
      await db.run(
        `UPDATE veiculos
           SET pessoa_id = ?, proprietario = ?, cpfProprietario = ?, atualizadoEm = ?
         WHERE id = ?`,
        [pessoaId, nomeProprietario || null, somenteDigitos(cpfProprietario || ''), agora, veiculoId]
      );
    }
  }

  // Vínculos > Pessoas
  static async obterVinculosPessoas(pessoaId) {
    const db = await initDatabase();
    return db.all(
      'SELECT id, nome, cpf, tipo FROM vinculos_pessoas WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  static async adicionarVinculoPessoa(pessoaId, vinc) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const novo = {
      id: randomUUID(),
      pessoa_id: pessoaId,
      nome: vinc.nome || null,
      cpf: vinc.cpf ? String(vinc.cpf).replace(/\D/g,'') : null,
      tipo: vinc.tipo || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await db.run(
      `INSERT INTO vinculos_pessoas (id, pessoa_id, nome, cpf, tipo, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [novo.id, novo.pessoa_id, novo.nome, novo.cpf, novo.tipo, novo.criadoEm, novo.atualizadoEm]
    );
    return novo;
  }

  static async removerVinculoPessoa(vinculoId) {
    const db = await initDatabase();
    const resultado = await db.run('DELETE FROM vinculos_pessoas WHERE id = ?', [vinculoId]);
    return resultado.changes > 0;
  }

  // Empresa e Sócios
  static async obterEmpresaPorPessoa(pessoaId) {
    const db = await initDatabase();
    const empresa = await db.get('SELECT * FROM empresas WHERE pessoa_id = ?', [pessoaId]);
    if (!empresa) return null;
    const socios = await db.all('SELECT id, nome, cpf FROM socios WHERE empresa_id = ? ORDER BY criadoEm ASC', [empresa.id]);
    return {
      id: empresa.id,
      cnpj: empresa.cnpj,
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia,
      naturezaJuridica: empresa.naturezaJuridica,
      dataInicioAtividade: empresa.dataInicioAtividade,
      situacaoCadastral: empresa.situacaoCadastral,
      cep: empresa.cep,
      endereco: empresa.endereco,
      telefone: empresa.telefone,
      socios
    };
  }

  static async upsertEmpresa(pessoaId, empresa) {
    const db = await initDatabase();
    const existente = await db.get('SELECT * FROM empresas WHERE pessoa_id = ?', [pessoaId]);
    const agora = new Date().toISOString();
    let empresaId;
    if (!existente) {
      empresaId = randomUUID();
      await db.run(
        `INSERT INTO empresas (id, pessoa_id, cnpj, razaoSocial, nomeFantasia, naturezaJuridica, dataInicioAtividade, situacaoCadastral, cep, endereco, telefone, criadoEm, atualizadoEm)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          empresaId,
          pessoaId,
          empresa.cnpj || null,
          empresa.razaoSocial || null,
          empresa.nomeFantasia || null,
          empresa.naturezaJuridica || null,
          empresa.dataInicioAtividade || null,
          empresa.situacaoCadastral || null,
          empresa.cep || null,
          empresa.endereco || null,
          empresa.telefone || null,
          agora,
          agora,
        ]
      );
    } else {
      empresaId = existente.id;
      await db.run(
        `UPDATE empresas SET cnpj = ?, razaoSocial = ?, nomeFantasia = ?, naturezaJuridica = ?, dataInicioAtividade = ?, situacaoCadastral = ?, cep = ?, endereco = ?, telefone = ?, atualizadoEm = ? WHERE id = ?`,
        [
          empresa.cnpj || null,
          empresa.razaoSocial || null,
          empresa.nomeFantasia || null,
          empresa.naturezaJuridica || null,
          empresa.dataInicioAtividade || null,
          empresa.situacaoCadastral || null,
          empresa.cep || null,
          empresa.endereco || null,
          empresa.telefone || null,
          agora,
          empresaId,
        ]
      );
    }

    // Substituir sócios
    const sociosAtuais = await db.all('SELECT id FROM socios WHERE empresa_id = ?', [empresaId]);
    for (const s of sociosAtuais) {
      await db.run('DELETE FROM socios WHERE id = ?', [s.id]);
    }
    if (Array.isArray(empresa.socios)) {
      for (const s of empresa.socios) {
        const novoId = randomUUID();
        await db.run(
          `INSERT INTO socios (id, empresa_id, nome, cpf, criadoEm, atualizadoEm) VALUES (?, ?, ?, ?, ?, ?)`,
          [novoId, empresaId, s.nome || null, s.cpf || null, agora, agora]
        );
      }
    }

    return this.obterEmpresaPorPessoa(pessoaId);
  }

  // Atualiza campos da pessoa (dados pessoais)
  static async update(id, updates) {
    const db = await initDatabase();
    const campos = [];
    const valores = [];

    const colunasPermitidas = [
      'nomeCompleto',
      'apelido',
      'dataNascimento',
      'idade',
      'cpf',
      'rg',
      'cnh',
      'nomeMae',
      'nomePai',
      'endereco_atual_index',
      'vinculos_json',
      'ocorrencias_json',
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
    // Remover arquivos físicos antes de apagar os vínculos no banco.
    await this.removerFotosPorPessoa(id);
    const resultado = await db.run('DELETE FROM pessoas WHERE id = ?', [id]);
    return resultado.changes > 0;
  }
}

module.exports = PessoaModel;
