const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

// Diretório público base utilizado para calcular caminhos relativos das fotos
const publicDir = path.join(__dirname, '../../public');

// Converte um caminho salvo no banco para URL acessível pelo servidor estático
function gerarUrlPublica(caminhoRelativo) {
  if (!caminhoRelativo) return null;
  const normalizado = caminhoRelativo.replace(/\\/g, '/');
  return `/${normalizado.replace(/^\//, '')}`;
}

// Remove arquivo físico, mas não interrompe o fluxo em caso de falha
function removerArquivoFisico(caminhoRelativo) {
  if (!caminhoRelativo) return;
  const absoluto = path.join(publicDir, caminhoRelativo);
  fs.promises.unlink(absoluto).catch(() => {});
}

// Normaliza lideranças para o formato { nome, cpf } ao carregar do JSON
function normalizarLiderancas(liderancasBrutas) {
  const lista = Array.isArray(liderancasBrutas)
    ? liderancasBrutas
    : liderancasBrutas !== undefined && liderancasBrutas !== null
      ? [liderancasBrutas]
      : [];

  return lista
    .map((item) => {
      if (typeof item === 'string') {
        const nome = String(item || '').trim();
        return nome ? { id: randomUUID(), nome, cpf: null } : null;
      }
      if (item && typeof item === 'object') {
        const nome = item.nome !== undefined ? String(item.nome || '').trim() : '';
        const cpf = item.cpf !== undefined ? String(item.cpf || '').replace(/\D/g, '') : '';
        const id = item.id !== undefined ? String(item.id || '').trim() : '';
        const nomeFinal = nome || null;
        const cpfFinal = cpf || null;
        if (!nomeFinal && !cpfFinal) return null;
        return { id: id || randomUUID(), nome: nomeFinal, cpf: cpfFinal };
      }
      return null;
    })
    .filter(Boolean);
}

// Comentário: normaliza e detecta se precisa persistir ids ausentes.
function precisaPersistirLiderancas(liderancasBrutas) {
  const lista = Array.isArray(liderancasBrutas) ? liderancasBrutas : [];
  return lista.some((item) => typeof item === 'string' || (item && typeof item === 'object' && !item.id));
}

class EntidadeModel {
  // Comentário: hidrata relacionamentos para manter retorno consistente nas buscas.
  static async _hidratarEntidade(entidade, db) {
    const ent = { ...entidade };
    if (ent.liderancas_json) {
      try {
        ent.liderancas = normalizarLiderancas(JSON.parse(ent.liderancas_json));
      } catch (_) {
        ent.liderancas = [];
      }
    } else {
      ent.liderancas = [];
    }
    delete ent.liderancas_json;
    ent.telefones = await db.all(
      'SELECT id, numero FROM entidades_telefones WHERE entidade_id = ? ORDER BY criadoEm ASC',
      [ent.id],
    );
    ent.enderecos = await db.all(
      'SELECT id, logradouro, bairro, cidade, uf, cep, complemento FROM entidades_enderecos WHERE entidade_id = ? ORDER BY criadoEm ASC',
      [ent.id],
    );
    ent.veiculos = await this._listarVeiculos(db, ent.id);
    const fotos = await db.all(
      'SELECT id, nome_arquivo, caminho, mime_type, tamanho FROM entidades_fotos WHERE entidade_id = ? ORDER BY criadoEm ASC',
      [ent.id],
    );
    ent.fotos = fotos.map((f) => this.mapearFoto(f));
    return ent;
  }
  static async _listarVeiculos(db, entidadeId) {
    return db.all(
      'SELECT id, nomeProprietario, cnpj, placa, marcaModelo, cor, anoModelo, obs, criadoEm, atualizadoEm FROM veiculos_entidades WHERE entidade_id = ? ORDER BY atualizadoEm DESC',
      [entidadeId],
    );
  }

  static async _salvarVeiculos(db, entidadeId, veiculos) {
    if (!Array.isArray(veiculos) || veiculos.length === 0) return;
    const agora = new Date().toISOString();
    for (const v of veiculos) {
      const id = v.id || randomUUID();
      await db.run(
        `INSERT INTO veiculos_entidades (id, entidade_id, nomeProprietario, cnpj, placa, marcaModelo, cor, anoModelo, obs, criadoEm, atualizadoEm)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          entidadeId,
          v.nomeProprietario || null,
          v.cnpj || null,
          v.placa || null,
          v.marcaModelo || null,
          v.cor || null,
          typeof v.anoModelo === 'number' ? v.anoModelo : null,
          v.obs || null,
          agora,
          agora,
        ],
      );
    }
  }

  static async _removerVeiculos(db, entidadeId) {
    await db.run('DELETE FROM veiculos_entidades WHERE entidade_id = ?', [entidadeId]);
  }

  // Mapeia metadados da foto incluindo URL pública
  static mapearFoto(foto) {
    if (!foto) return null;
    return {
      ...foto,
      nomeArquivo: foto.nome_arquivo || foto.nomeArquivo,
      mimeType: foto.mime_type || foto.mimeType,
      url: gerarUrlPublica(foto.caminho),
    };
  }

  // Cria entidade e relacionamentos dentro de uma transação para garantir consistência
  static async create(dados) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const id = randomUUID();

    await db.beginTransaction();
    try {
      await db.run(
        `INSERT INTO entidades (id, nome, cnpj, liderancas_json, descricao, obs, criadoEm, atualizadoEm)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          dados.nome,
          dados.cnpj || null,
          dados.liderancas?.length ? JSON.stringify(dados.liderancas) : null,
          dados.descricao || null,
          dados.obs || null,
          agora,
          agora,
        ],
      );

      for (const numero of dados.telefones || []) {
        const telefone = {
          id: randomUUID(),
          entidade_id: id,
          numero,
          criadoEm: agora,
          atualizadoEm: agora,
        };
        await db.run(
          `INSERT INTO entidades_telefones (id, entidade_id, numero, criadoEm, atualizadoEm)
           VALUES (?, ?, ?, ?, ?)`,
          [telefone.id, telefone.entidade_id, telefone.numero, telefone.criadoEm, telefone.atualizadoEm],
        );
      }

      for (const end of dados.enderecos || []) {
        const endereco = {
          id: randomUUID(),
          entidade_id: id,
          logradouro: end.logradouro || null,
          bairro: end.bairro || null,
          cidade: end.cidade || null,
          uf: end.uf || null,
          cep: end.cep || null,
          complemento: end.complemento || null,
          criadoEm: agora,
          atualizadoEm: agora,
        };
        await db.run(
          `INSERT INTO entidades_enderecos (
             id, entidade_id, logradouro, bairro, cidade, uf, cep, complemento, criadoEm, atualizadoEm
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            endereco.id,
            endereco.entidade_id,
            endereco.logradouro,
            endereco.bairro,
            endereco.cidade,
            endereco.uf,
            endereco.cep,
            endereco.complemento,
            endereco.criadoEm,
            endereco.atualizadoEm,
          ],
        );
      }

      if (Array.isArray(dados.veiculos) && dados.veiculos.length) {
        await this._salvarVeiculos(db, id, dados.veiculos);
      }

      for (const foto of dados.fotos || []) {
        await this.adicionarFoto(id, foto, db);
      }

      await db.commit();
      return this.findById(id);
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  // Consulta todas as entidades trazendo telefones, endereços e fotos
  static async findAll() {
    const db = await initDatabase();
    const entidades = await db.all('SELECT * FROM entidades ORDER BY atualizadoEm DESC');

    const resultado = [];
    for (const ent of entidades) {
      resultado.push(await this._hidratarEntidade(ent, db));
    }

    return resultado;
  }

  // Busca detalhada pelo id
  static async findById(id) {
    const db = await initDatabase();
    const ent = await db.get('SELECT * FROM entidades WHERE id = ?', [id]);
    if (!ent) return null;

    return this._hidratarEntidade(ent, db);
  }

  // Aplica filtros no banco para consulta avançada de entidades e campos relacionados.
  static async findByFilters(filtros = {}) {
    const db = await initDatabase();
    const where = ['1=1'];
    const params = [];

    const normalizarTermoLike = (valor) => `%${String(valor).toLowerCase()}%`;
    const normalizarDigitos = (valor) => String(valor || '').replace(/\D/g, '');

    const termoPesquisa = filtros.pesquisaGeral || filtros.q;
    if (termoPesquisa) {
      const termoLike = normalizarTermoLike(termoPesquisa);
      const termoDigits = normalizarDigitos(termoPesquisa);
      const termoNumerico = termoDigits ? `%${termoDigits}%` : termoLike;

      const clausulasPrincipais = [
        'LOWER(ent.nome) LIKE ?',
        'LOWER(IFNULL(ent.descricao, "")) LIKE ?',
        'LOWER(IFNULL(ent.obs, "")) LIKE ?',
        'LOWER(IFNULL(ent.liderancas_json, "")) LIKE ?',
        'LOWER(IFNULL(ent.cnpj, "")) LIKE ?',
      ];

      const clausulasEndereco = [
        'LOWER(en.uf) LIKE ?',
        'LOWER(en.logradouro) LIKE ?',
        'LOWER(en.bairro) LIKE ?',
        'LOWER(en.cidade) LIKE ?',
        'LOWER(en.complemento) LIKE ?',
        'LOWER(en.cep) LIKE ?',
      ];

      const clausulasVeiculos = [
        'LOWER(ve.placa) LIKE ?',
        'LOWER(ve.marcaModelo) LIKE ?',
        'LOWER(ve.cor) LIKE ?',
        'LOWER(ve.nomeProprietario) LIKE ?',
        'LOWER(IFNULL(ve.obs, "")) LIKE ?',
        'LOWER(CAST(ve.anoModelo AS TEXT)) LIKE ?',
        'LOWER(IFNULL(ve.cnpj, "")) LIKE ?',
      ];

      const consultasRelacionadas = [
        {
          sql: 'EXISTS (SELECT 1 FROM entidades_telefones tel WHERE tel.entidade_id = ent.id AND LOWER(tel.numero) LIKE ?)',
          count: 1,
        },
        {
          sql: `EXISTS (SELECT 1 FROM entidades_enderecos en WHERE en.entidade_id = ent.id AND (${clausulasEndereco.join(' OR ')}))`,
          count: clausulasEndereco.length,
        },
        {
          sql: `EXISTS (SELECT 1 FROM veiculos_entidades ve WHERE ve.entidade_id = ent.id AND (${clausulasVeiculos.join(' OR ')}))`,
          count: clausulasVeiculos.length,
        },
      ];

      where.push(`(${[...clausulasPrincipais, ...consultasRelacionadas.map((c) => c.sql)].join(' OR ')})`);

      clausulasPrincipais.forEach((clausula) => {
        params.push(clausula.includes('cnpj') ? termoNumerico : termoLike);
      });
      consultasRelacionadas.forEach(({ count, sql }) => {
        for (let i = 0; i < count; i += 1) {
          const usarNumerico = sql.includes('tel.numero');
          params.push(usarNumerico ? termoNumerico : termoLike);
        }
      });
    }

    if (filtros.nome) {
      where.push('LOWER(ent.nome) LIKE ?');
      params.push(normalizarTermoLike(filtros.nome));
    }

    if (filtros.cnpj) {
      const cnpj = normalizarDigitos(filtros.cnpj);
      if (cnpj) {
        where.push('ent.cnpj LIKE ?');
        params.push(`%${cnpj}%`);
      }
    }

    const termoLideranca = filtros.lider || filtros.lideranca || filtros.liderancas;
    if (termoLideranca) {
      where.push('LOWER(IFNULL(ent.liderancas_json, "")) LIKE ?');
      params.push(normalizarTermoLike(termoLideranca));
    }

    if (filtros.telefone) {
      const telefone = normalizarDigitos(filtros.telefone);
      if (telefone) {
        where.push(
          'EXISTS (SELECT 1 FROM entidades_telefones tel WHERE tel.entidade_id = ent.id AND tel.numero LIKE ?)',
        );
        params.push(`%${telefone}%`);
      }
    }

    if (filtros.endereco) {
      const termo = normalizarTermoLike(filtros.endereco);
      const cep = normalizarDigitos(filtros.endereco);
      const termoCep = cep ? `%${cep}%` : termo;
      const clausulas = [
        'LOWER(en.uf) LIKE ?',
        'LOWER(en.logradouro) LIKE ?',
        'LOWER(en.bairro) LIKE ?',
        'LOWER(en.cidade) LIKE ?',
        'LOWER(en.complemento) LIKE ?',
        'LOWER(en.cep) LIKE ?',
      ];
      where.push(
        `EXISTS (SELECT 1 FROM entidades_enderecos en WHERE en.entidade_id = ent.id AND (${clausulas.join(' OR ')}))`,
      );
      clausulas.forEach((clausula) => {
        params.push(clausula.includes('cep') ? termoCep : termo);
      });
    }

    if (filtros.veiculos) {
      const termo = normalizarTermoLike(filtros.veiculos);
      const termoDigits = normalizarDigitos(filtros.veiculos);
      const termoNumerico = termoDigits ? `%${termoDigits}%` : termo;
      const clausulas = [
        'LOWER(ve.placa) LIKE ?',
        'LOWER(ve.marcaModelo) LIKE ?',
        'LOWER(ve.cor) LIKE ?',
        'LOWER(ve.nomeProprietario) LIKE ?',
        'LOWER(IFNULL(ve.obs, "")) LIKE ?',
        'LOWER(CAST(ve.anoModelo AS TEXT)) LIKE ?',
        'LOWER(IFNULL(ve.cnpj, "")) LIKE ?',
      ];
      where.push(
        `EXISTS (SELECT 1 FROM veiculos_entidades ve WHERE ve.entidade_id = ent.id AND (${clausulas.join(' OR ')}))`,
      );
      clausulas.forEach((clausula) => {
        params.push(clausula.includes('anoModelo') || clausula.includes('cnpj') ? termoNumerico : termo);
      });
    }

    const entidades = await db.all(
      `SELECT * FROM entidades ent WHERE ${where.join(' AND ')} ORDER BY ent.atualizadoEm DESC`,
      params,
    );

    const resultado = [];
    for (const ent of entidades) {
      resultado.push(await this._hidratarEntidade(ent, db));
    }

    return resultado;
  }

  // Atualiza dados principais e substitui coleções opcionais
  static async update(id, updates) {
    const db = await initDatabase();
    const agora = new Date().toISOString();

    await db.beginTransaction();
    try {
      const campos = [];
      const valores = [];
      const permitidas = ['nome', 'cnpj', 'descricao', 'obs'];

      permitidas.forEach((campo) => {
        if (updates[campo] !== undefined) {
          campos.push(`${campo} = ?`);
          valores.push(updates[campo]);
        }
      });

      if (updates.liderancas !== undefined) {
        campos.push('liderancas_json = ?');
        valores.push(updates.liderancas?.length ? JSON.stringify(updates.liderancas) : null);
      }

      campos.push('atualizadoEm = ?');
      valores.push(agora, id);

      if (campos.length) {
        const resultado = await db.run(
          `UPDATE entidades SET ${campos.join(', ')} WHERE id = ?`,
          valores,
        );
        if (!resultado.changes) {
          await db.rollback();
          return null;
        }
      }

      if (Array.isArray(updates.telefones)) {
        await db.run('DELETE FROM entidades_telefones WHERE entidade_id = ?', [id]);
        for (const numero of updates.telefones) {
          await db.run(
            `INSERT INTO entidades_telefones (id, entidade_id, numero, criadoEm, atualizadoEm)
             VALUES (?, ?, ?, ?, ?)`,
            [randomUUID(), id, numero, agora, agora],
          );
        }
      }

      if (Array.isArray(updates.enderecos)) {
        await db.run('DELETE FROM entidades_enderecos WHERE entidade_id = ?', [id]);
        for (const end of updates.enderecos) {
          await db.run(
            `INSERT INTO entidades_enderecos (
               id, entidade_id, logradouro, bairro, cidade, uf, cep, complemento, criadoEm, atualizadoEm
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              randomUUID(),
              id,
              end.logradouro || null,
              end.bairro || null,
              end.cidade || null,
              end.uf || null,
              end.cep || null,
              end.complemento || null,
              agora,
              agora,
            ],
          );
        }
      }

      if (Array.isArray(updates.veiculos)) {
        await this._removerVeiculos(db, id);
        await this._salvarVeiculos(db, id, updates.veiculos);
      }

      for (const fotoId of updates.fotosParaRemover || []) {
        await this.removerFoto(fotoId, db);
      }

      for (const foto of updates.fotos || []) {
        await this.adicionarFoto(id, foto, db);
      }

      await db.commit();
      return this.findById(id);
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  // Remove entidade e apaga arquivos associados
  static async delete(id) {
    const db = await initDatabase();
    const fotos = await db.all('SELECT id FROM entidades_fotos WHERE entidade_id = ?', [id]);

    await db.beginTransaction();
    try {
      for (const foto of fotos) {
        await this.removerFoto(foto.id, db);
      }
      const resultado = await db.run('DELETE FROM entidades WHERE id = ?', [id]);
      await db.commit();
      return resultado.changes > 0;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  // Insere foto com metadados reutilizável em create/update
  static async adicionarFoto(entidadeId, arquivo, dbArg) {
    const db = dbArg || await initDatabase();
    const agora = new Date().toISOString();
    const caminhoRelativo = path.relative(publicDir, arquivo.caminho || arquivo.path || '');

    const foto = {
      id: randomUUID(),
      entidade_id: entidadeId,
      nome_arquivo: arquivo.nomeOriginal || arquivo.originalname || null,
      caminho: caminhoRelativo,
      mime_type: arquivo.mimeType || arquivo.mimetype || null,
      tamanho: arquivo.tamanho || arquivo.size || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO entidades_fotos (id, entidade_id, nome_arquivo, caminho, mime_type, tamanho, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        foto.id,
        foto.entidade_id,
        foto.nome_arquivo,
        foto.caminho,
        foto.mime_type,
        foto.tamanho,
        foto.criadoEm,
        foto.atualizadoEm,
      ],
    );

    return this.mapearFoto(foto);
  }

  // Exclui foto individual garantindo remoção física
  static async removerFoto(fotoId, dbArg) {
    const db = dbArg || await initDatabase();
    const foto = await db.get('SELECT caminho FROM entidades_fotos WHERE id = ?', [fotoId]);
    if (!foto) return false;

    const resultado = await db.run('DELETE FROM entidades_fotos WHERE id = ?', [fotoId]);
    if (resultado.changes > 0) {
      removerArquivoFisico(foto.caminho);
    }
    return resultado.changes > 0;
  }

  // Retorna e normaliza lideranças garantindo id persistente quando necessário
  static async getLiderancas(entidadeId, dbArg) {
    const db = dbArg || await initDatabase();
    const ent = await db.get('SELECT liderancas_json FROM entidades WHERE id = ?', [entidadeId]);
    if (!ent) return null;

    let brutas = [];
    if (ent.liderancas_json) {
      try {
        brutas = JSON.parse(ent.liderancas_json) || [];
      } catch (_) {
        brutas = [];
      }
    }

    const precisaPersistir = precisaPersistirLiderancas(brutas);
    const liderancas = normalizarLiderancas(brutas);

    if (precisaPersistir) {
      await db.run(
        'UPDATE entidades SET liderancas_json = ?, atualizadoEm = ? WHERE id = ?',
        [liderancas.length ? JSON.stringify(liderancas) : null, new Date().toISOString(), entidadeId],
      );
    }

    return liderancas;
  }

  // Atualiza o JSON de lideranças dentro da entidade
  static async setLiderancas(entidadeId, liderancas, dbArg) {
    const db = dbArg || await initDatabase();
    const agora = new Date().toISOString();
    await db.run(
      'UPDATE entidades SET liderancas_json = ?, atualizadoEm = ? WHERE id = ?',
      [liderancas?.length ? JSON.stringify(liderancas) : null, agora, entidadeId],
    );
  }

  // Adiciona liderança ao JSON de forma parcial
  static async addLideranca(entidadeId, lideranca, dbArg) {
    const db = dbArg || await initDatabase();
    await db.beginTransaction();
    try {
      const liderancas = await this.getLiderancas(entidadeId, db);
      if (!liderancas) {
        await db.rollback();
        return null;
      }
      const nova = {
        id: lideranca.id || randomUUID(),
        nome: lideranca.nome || null,
        cpf: lideranca.cpf || null,
      };
      liderancas.push(nova);
      await this.setLiderancas(entidadeId, liderancas, db);
      await db.commit();
      return nova;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  // Atualiza liderança específica pelo id
  static async updateLideranca(entidadeId, liderancaId, atualizacoes, dbArg) {
    const db = dbArg || await initDatabase();
    await db.beginTransaction();
    try {
      const liderancas = await this.getLiderancas(entidadeId, db);
      if (!liderancas) {
        await db.rollback();
        return null;
      }
      const index = liderancas.findIndex((item) => item.id === liderancaId);
      if (index < 0) {
        await db.rollback();
        return false;
      }
      liderancas[index] = {
        ...liderancas[index],
        ...atualizacoes,
        id: liderancaId,
      };
      await this.setLiderancas(entidadeId, liderancas, db);
      await db.commit();
      return liderancas[index];
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  // Remove liderança específica pelo id
  static async removeLideranca(entidadeId, liderancaId, dbArg) {
    const db = dbArg || await initDatabase();
    await db.beginTransaction();
    try {
      const liderancas = await this.getLiderancas(entidadeId, db);
      if (!liderancas) {
        await db.rollback();
        return null;
      }
      const atualizadas = liderancas.filter((item) => item.id !== liderancaId);
      if (atualizadas.length === liderancas.length) {
        await db.rollback();
        return false;
      }
      await this.setLiderancas(entidadeId, atualizadas, db);
      await db.commit();
      return true;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }
}

module.exports = EntidadeModel;
