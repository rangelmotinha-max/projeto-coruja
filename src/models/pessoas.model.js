const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');
const VeiculoPessoaModel = require('./veiculos-pessoas.model');
const FaccaoModel = require('./faccoes.model');
const EntidadeModel = require('./entidades.model');

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

// Normaliza o CPF para busca/armazenamento sem caracteres especiais
function limparCpf(cpf) {
  return cpf ? String(cpf).replace(/\D/g, '') : null;
}

// Localiza ou atualiza veículo associado usando CPF, placa ou nome do proprietário
async function upsertVeiculoParaPessoa(pessoa, veiculoDados, dbArg) {
  if (!veiculoDados) return null;

  // Garante preenchimento dos campos essenciais herdando do cadastro principal
  const veiculo = {
    ...veiculoDados,
    pessoaId: pessoa.id,
    nomeProprietario: veiculoDados.nomeProprietario || pessoa.nomeCompleto,
    cpf: limparCpf(veiculoDados.cpf || pessoa.cpf),
  };

  // Comentário: só reaproveitamos quando a placa bate; sem placa, usamos CPF ou nome
  let existente = null;
  if (veiculo.placa) {
    existente = await VeiculoPessoaModel.findByPlaca(pessoa.id, veiculo.placa, dbArg);
  } else if (veiculo.cpf) {
    existente = await VeiculoPessoaModel.findByCpf(pessoa.id, veiculo.cpf, dbArg);
  } else if (veiculo.nomeProprietario) {
    existente = await VeiculoPessoaModel.findByNomeProprietario(pessoa.id, veiculo.nomeProprietario, dbArg);
  }

  if (existente) {
    // Comentário: atualiza mantendo o vínculo com o cadastro mais recente
    return VeiculoPessoaModel.update(existente.id, veiculo, dbArg);
  }

  return VeiculoPessoaModel.create(veiculo, dbArg);
}

// Sincroniza a lista de veículos de uma pessoa, preservando apenas os enviados
async function sincronizarVeiculosParaPessoa(pessoa, listaVeiculos, dbArg) {
  if (!Array.isArray(listaVeiculos)) return [];

  const veiculosValidos = listaVeiculos
    .map((v) => ({
      ...v,
      nomeProprietario: v.nomeProprietario || pessoa.nomeCompleto,
      cpf: limparCpf(v.cpf || pessoa.cpf),
    }))
    // Mantém apenas veículos com alguma informação relevante
    .filter((v) => Object.values({ ...v, anoModelo: v.anoModelo ?? '' })
      .some((valor) => String(valor ?? '').trim() !== ''));

  const veiculosPersistidos = [];
  for (const veiculo of veiculosValidos) {
    const salvo = await upsertVeiculoParaPessoa(pessoa, veiculo, dbArg);
    if (salvo) veiculosPersistidos.push(salvo);
  }

  // Remove veículos que pertenciam ao titular mas não foram reenviados (por placa)
  const veiculosDoTitular = await VeiculoPessoaModel.findAllByPessoaId(pessoa.id, dbArg);
  const placasEnviadas = new Set(veiculosValidos.map((v) => v.placa).filter(Boolean));
  for (const existente of veiculosDoTitular) {
    if (existente.placa && !placasEnviadas.has(existente.placa)) {
      await VeiculoPessoaModel.delete(existente.id, dbArg);
    }
  }

  return veiculosPersistidos;
}

// Hidrata veículos vinculados ao CPF ou nome do titular para pré-preenchimento do formulário
async function localizarVeiculosAssociados(pessoa) {
  if (!pessoa) return [];

  // Comentário: agora todos os veículos vinculados ficam na tabela dedicada
  return VeiculoPessoaModel.findAllByPessoaId(pessoa.id);
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
      // Campo livre para registrar sinais ou características físicas relevantes
      sinais: dados.sinais || null,
      // Associação opcional a facção/organização criminosa
      faccao_id: dados.faccaoId || null,
      endereco_atual_index: dados.endereco_atual_index || 0,
      vinculos_json: dados.vinculos ? JSON.stringify(dados.vinculos) : null,
      ocorrencias_json: dados.ocorrencias ? JSON.stringify(dados.ocorrencias) : null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    // Inicia transação para garantir consistência entre pessoa e relacionamentos
    await db.beginTransaction();

    try {
      await db.run(
        `INSERT INTO pessoas (
          id, nomeCompleto, apelido, dataNascimento, idade, cpf, rg, cnh, nomeMae, nomePai, sinais,
          faccao_id, endereco_atual_index, vinculos_json, ocorrencias_json, criadoEm, atualizadoEm
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          pessoa.sinais,
          pessoa.faccao_id,
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
          await this.adicionarEndereco(pessoa.id, endereco, db);
        }
      }

      // Salvar telefones se fornecidos
      if (dados.telefones && Array.isArray(dados.telefones)) {
        for (const telefone of dados.telefones) {
          if (telefone.trim()) {
            await this.adicionarTelefone(pessoa.id, telefone, db);
          }
        }
      }

      // Salvar emails se fornecidos
      if (dados.emails && Array.isArray(dados.emails)) {
        for (const email of dados.emails) {
          if (email.trim()) {
            await this.adicionarEmail(pessoa.id, email, db);
          }
        }
      }

      // Salvar redes sociais se fornecidas
      let redesSociaisCriadas = [];
      if (dados.redesSociais && Array.isArray(dados.redesSociais)) {
        redesSociaisCriadas = await this.sincronizarRedesSociais(pessoa.id, dados.redesSociais, db);
      }

      // Salvar empresa e sócios se fornecidos
      if (dados.empresa && typeof dados.empresa === 'object') {
        await this.upsertEmpresa(pessoa.id, dados.empresa, db);
      }

      // Salvar vínculos (pessoas relacionadas)
      if (dados.vinculos && Array.isArray(dados.vinculos.pessoas)) {
        for (const vp of dados.vinculos.pessoas) {
          if ((vp.nome||vp.cpf||vp.tipo||'').toString().trim().length) {
            await this.adicionarVinculoPessoa(pessoa.id, vp, db);
          }
        }
      }

      // Salvar fotos carregadas durante o cadastro
      if (dados.fotos && Array.isArray(dados.fotos)) {
        for (const foto of dados.fotos) {
          await this.adicionarFoto(pessoa.id, foto, db);
        }
      }

      // Salvar QR-CODE (único) se enviado no cadastro
      if (dados.qrCode) {
        const redePrimeira = redesSociaisCriadas[0]?.id || null;
        await this.setQrCode(pessoa.id, dados.qrCode, redePrimeira, db);
      }
      // Salvar imagens de Perfil (múltiplas)
      if (dados.imagensPerfil && Array.isArray(dados.imagensPerfil)) {
        const redePrimeira = redesSociaisCriadas[0]?.id || null;
        for (const img of dados.imagensPerfil) {
          await this.adicionarImagemRede(pessoa.id, img, 'perfil', redePrimeira, db);
        }
      }
      // Salvar imagens de redes sociais com vínculo explícito por rede
      if (dados.redesImagensUploads && typeof dados.redesImagensUploads === 'object') {
        for (const item of dados.redesImagensUploads.qrCodes || []) {
          const redeId = redesSociaisCriadas[item.redeIndex]?.id || null;
          await this.setQrCode(pessoa.id, item.arquivo, redeId, db);
        }
        for (const item of dados.redesImagensUploads.perfis || []) {
          const redeId = redesSociaisCriadas[item.redeIndex]?.id || null;
          await this.adicionarImagemRede(pessoa.id, item.arquivo, 'perfil', redeId, db);
        }
      }

      // Sincroniza veículos vinculados antes de hidratar o retorno
      if (Array.isArray(dados.veiculos) && dados.veiculos.length) {
        await sincronizarVeiculosParaPessoa(pessoa, dados.veiculos, db);
      } else if (dados.veiculo) {
        await upsertVeiculoParaPessoa(pessoa, dados.veiculo, db);
      }

      // Finaliza transação somente após todas as operações concluírem
      await db.commit();
    } catch (erro) {
      // Reverte qualquer alteração parcial e propaga exceção original
      await db.rollback();
      throw erro;
    }

    // Reidrata a pessoa recém-criada para devolver todas as relações populadas
    // (enderecos, telefones, emails, redes sociais, vínculos, empresa e fotos persistidas).
    const pessoaHidratada = await this.findById(pessoa.id);
    return pessoaHidratada || { ...pessoa, enderecos: [], telefones: [], emails: [], redesSociais: [], fotos: await this.obterFotosPorPessoa(pessoa.id) };
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

  // Exposto para permitir que serviços sincronizem veículo com dados atualizados
  static async sincronizarVeiculo(pessoa, veiculoDados, dbArg) {
    return upsertVeiculoParaPessoa(pessoa, veiculoDados, dbArg);
  }

  // Mantém múltiplos veículos vinculados alinhados ao cadastro principal
  static async sincronizarVeiculos(pessoa, veiculosDados, dbArg) {
    return sincronizarVeiculosParaPessoa(pessoa, veiculosDados, dbArg);
  }

  // Hidrata o objeto de pessoa com relacionamentos e campos derivados.
  static async hidratarPessoa(pessoa) {
    pessoa.enderecos = await this.obterEnderecosPorPessoa(pessoa.id);
    pessoa.telefones = (await this.obterTelefonesPorPessoa(pessoa.id)).map(t => t.numero);
    pessoa.emails = (await this.obterEmailsPorPessoa(pessoa.id)).map(e => e.email);
    const redes = await this.obterRedesPorPessoa(pessoa.id);
    pessoa.redesSociais = redes.map(r => r.perfil);
    pessoa.fotos = await this.obterFotosPorPessoa(pessoa.id);
    // Hidratar imagens de redes sociais
    pessoa.redesImagens = await this.obterImagensRedesPorPessoa(pessoa.id, redes);
    pessoa.empresa = await this.obterEmpresaPorPessoa(pessoa.id);
    // Inclui veículos associados por CPF ou nome para facilitar edição
    pessoa.veiculos = await localizarVeiculosAssociados(pessoa);
    pessoa.veiculo = pessoa.veiculos[0] || null;
    // Hidrata facção associada (opcional)
    pessoa.faccao = await FaccaoModel.findById(pessoa.faccao_id || pessoa.faccaoId || null);
    pessoa.faccaoId = pessoa.faccao?.id || pessoa.faccao_id || null;
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
    // Comentário: entidades vinculadas com ID são reidratadas para exibir metadados atualizados no formulário
    let vinculosJsonComEntidades = vinculosFromJson;
    if (Array.isArray(vinculosFromJson.entidades)) {
      const entidadesHidratadas = await Promise.all(vinculosFromJson.entidades.map(async (entidade) => {
        const base = entidade && typeof entidade === 'object' ? { ...entidade } : {};
        const id = base.id ?? base.entidadeId;
        let detalhes = null;
        if (id) {
          try {
            detalhes = await EntidadeModel.findById(id);
          } catch (_) {
            detalhes = null;
          }
        }
        const nomeDetalhado = detalhes?.nome || detalhes?.nomeFantasia || detalhes?.razaoSocial;
        const descricaoDetalhada = detalhes?.descricao;
        const liderDetalhado = Array.isArray(detalhes?.liderancas) && detalhes.liderancas.length
          ? detalhes.liderancas[0]
          : detalhes?.lider || null;
        const liderNormalizado = (() => {
          if (base.lider) return base.lider;
          if (Array.isArray(base.liderancas) && base.liderancas.length) return base.liderancas[0];
          return liderDetalhado;
        })();
        const observacaoNormalizada = base.observacoes || base.descricao || descricaoDetalhada || base.lider || null;
        return {
          ...base,
          id: id || undefined,
          nome: base.nome || nomeDetalhado || null,
          observacoes: observacaoNormalizada,
          lider: liderNormalizado,
          liderancas: base.liderancas || detalhes?.liderancas || [],
          descricao: base.descricao || descricaoDetalhada || null,
        };
      }));
      vinculosJsonComEntidades = { ...vinculosFromJson, entidades: entidadesHidratadas };
    }
    pessoa.vinculos = { pessoas: vinculosPessoas, ...vinculosJsonComEntidades };
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

    // Normaliza termo para comparação case-insensitive preservando curingas
    const normalizarTermoLike = (valor) => `%${String(valor).toLowerCase()}%`;

    // Busca ampla: aplica o mesmo termo em todos os campos conhecidos do cadastro e suas tabelas relacionadas.
    if (filtros.pesquisaGeral) {
      const termoGeral = normalizarTermoLike(filtros.pesquisaGeral);
      const camposPrincipais = [
        'LOWER(p.nomeCompleto) LIKE ?',
        'LOWER(p.apelido) LIKE ?',
        'LOWER(p.cpf) LIKE ?',
        'LOWER(p.rg) LIKE ?',
        'LOWER(p.cnh) LIKE ?',
        'LOWER(p.dataNascimento) LIKE ?',
        'LOWER(CAST(p.idade AS TEXT)) LIKE ?',
        'LOWER(p.nomeMae) LIKE ?',
        'LOWER(p.nomePai) LIKE ?',
        'LOWER(p.sinais) LIKE ?',
        'LOWER(IFNULL(f.nome, "")) LIKE ?',
        'LOWER(IFNULL(f.sigla, "")) LIKE ?',
        'LOWER(IFNULL(p.vinculos_json, "")) LIKE ?',
        'LOWER(IFNULL(p.ocorrencias_json, "")) LIKE ?',
      ];

      const clausulasEndereco = [
        'LOWER(e.uf) LIKE ?',
        'LOWER(e.logradouro) LIKE ?',
        'LOWER(e.bairro) LIKE ?',
        'LOWER(e.complemento) LIKE ?',
        'LOWER(e.cep) LIKE ?',
        'LOWER(e.lat_long) LIKE ?',
      ];

      const clausulasVinculos = [
        'LOWER(vp.nome) LIKE ?',
        'LOWER(vp.cpf) LIKE ?',
        'LOWER(vp.tipo) LIKE ?',
      ];

      const consultasRelacionadas = [
        { sql: 'EXISTS (SELECT 1 FROM telefones t WHERE t.pessoa_id = p.id AND LOWER(t.numero) LIKE ?)', count: 1 },
        { sql: 'EXISTS (SELECT 1 FROM emails e WHERE e.pessoa_id = p.id AND LOWER(e.email) LIKE ?)', count: 1 },
        { sql: 'EXISTS (SELECT 1 FROM redes_sociais r WHERE r.pessoa_id = p.id AND LOWER(r.perfil) LIKE ?)', count: 1 },
        {
          sql: `EXISTS (SELECT 1 FROM enderecos e WHERE e.pessoa_id = p.id AND (${clausulasEndereco.join(' OR ')}))`,
          count: clausulasEndereco.length,
        },
        {
          sql: `EXISTS (SELECT 1 FROM vinculos_pessoas vp WHERE vp.pessoa_id = p.id AND (${clausulasVinculos.join(' OR ')}))`,
          count: clausulasVinculos.length,
        },
      ];

      const clausulas = [...camposPrincipais, ...consultasRelacionadas.map((c) => c.sql)];
      where.push(`(${clausulas.join(' OR ')})`);

      // Replica o termo nas cláusulas principais e relacionadas para manter o número de parâmetros alinhado.
      camposPrincipais.forEach(() => params.push(termoGeral));
      consultasRelacionadas.forEach(({ count }) => {
        for (let i = 0; i < count; i += 1) {
          params.push(termoGeral);
        }
      });
    }

    // Filtro de nome completo ou apelido.
    if (filtros.nomeOuApelido) {
      where.push('(LOWER(p.nomeCompleto) LIKE ? OR LOWER(p.apelido) LIKE ?)');
      const termoNormalizado = normalizarTermoLike(filtros.nomeOuApelido);
      params.push(termoNormalizado, termoNormalizado);
    }

    // Filtro por documento (CPF, RG ou CNH).
    if (filtros.documento) {
      where.push('(LOWER(p.cpf) LIKE ? OR LOWER(p.rg) LIKE ? OR LOWER(p.cnh) LIKE ?)');
      const termoNormalizado = normalizarTermoLike(filtros.documento);
      params.push(termoNormalizado, termoNormalizado, termoNormalizado);
    }

    // Filtro por data de nascimento.
    if (filtros.dataNascimento) {
      where.push('LOWER(p.dataNascimento) LIKE ?');
      params.push(normalizarTermoLike(filtros.dataNascimento));
    }

    // Filtro por nome da mãe.
    if (filtros.nomeMae) {
      where.push('LOWER(p.nomeMae) LIKE ?');
      params.push(normalizarTermoLike(filtros.nomeMae));
    }

    // Filtro por nome do pai.
    if (filtros.nomePai) {
      where.push('LOWER(p.nomePai) LIKE ?');
      params.push(normalizarTermoLike(filtros.nomePai));
    }

    // Filtro por facção associada (ID ou nome)
    if (filtros.faccaoId) {
      where.push('p.faccao_id = ?');
      params.push(filtros.faccaoId);
    }

    if (filtros.faccaoNome) {
      const termo = normalizarTermoLike(filtros.faccaoNome);
      where.push('(LOWER(IFNULL(f.nome, "")) LIKE ? OR LOWER(IFNULL(f.sigla, "")) LIKE ?)');
      params.push(termo, termo);
    }

    // Filtro por sinais ou características físicas cadastradas.
    if (filtros.sinais) {
      where.push('LOWER(p.sinais) LIKE ?');
      params.push(normalizarTermoLike(filtros.sinais));
    }

    // Filtro por telefone considerando apenas a tabela oficial de telefones.
    if (filtros.telefone) {
      const termoNormalizado = normalizarTermoLike(filtros.telefone);
      where.push(
        'EXISTS (SELECT 1 FROM telefones t WHERE t.pessoa_id = p.id AND LOWER(t.numero) LIKE ?)' // busca apenas na fonte oficial
      );
      params.push(termoNormalizado);
    }

    // Filtro por email vinculado.
    if (filtros.email) {
      where.push(
        'EXISTS (SELECT 1 FROM emails e WHERE e.pessoa_id = p.id AND LOWER(e.email) LIKE ?)' // comparação sem diferenciar maiúsculas
      );
      params.push(normalizarTermoLike(filtros.email));
    }

    const pessoas = await db.all(
      `SELECT DISTINCT p.*, f.nome AS faccao_nome, f.sigla AS faccao_sigla
         FROM pessoas p
         LEFT JOIN faccoes f ON f.id = p.faccao_id
       WHERE ${where.join(' AND ')}
       ORDER BY p.nomeCompleto ASC`,
      params,
    );

    for (const pessoa of pessoas) {
      await this.hidratarPessoa(pessoa);
    }

    return pessoas;
  }

  // Obtém todos os endereços de uma pessoa
  static async obterEnderecosPorPessoa(pessoaId, dbArg) {
    const db = dbArg || await initDatabase();
    return db.all(
      // Retorna lat/long com alias em camelCase para o frontend
      'SELECT id, uf, logradouro, numero, bairro, cidade, complemento, obs, cep, lat_long AS latLong FROM enderecos WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  // Adiciona um novo endereço para uma pessoa
  static async adicionarEndereco(pessoaId, endereco, dbArg) {
    const db = dbArg || await initDatabase();
    const agora = new Date().toISOString();
    
    const novoEndereco = {
      id: randomUUID(),
      pessoa_id: pessoaId,
      uf: endereco.uf || null,
      logradouro: endereco.logradouro || null,
      numero: endereco.numero || null,
      bairro: endereco.bairro || null,
      cidade: endereco.cidade || null,
      // Complemento agora é salvo para permitir recuperar o campo na edição.
      complemento: endereco.complemento || null,
      // Observações livres
      obs: endereco.obs || null,
      // Armazena texto livre de latitude/longitude preenchido pelo usuário
      latLong: endereco.latLong || null,
      cep: endereco.cep || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO enderecos (id, pessoa_id, uf, logradouro, numero, bairro, cidade, complemento, obs, lat_long, cep, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        novoEndereco.id,
        novoEndereco.pessoa_id,
        novoEndereco.uf,
        novoEndereco.logradouro,
        novoEndereco.numero,
        novoEndereco.bairro,
        novoEndereco.cidade,
        novoEndereco.complemento,
        novoEndereco.obs,
        novoEndereco.latLong,
        novoEndereco.cep,
        novoEndereco.criadoEm,
        novoEndereco.atualizadoEm,
      ]
    );

    return novoEndereco;
  }

  // Atualiza um endereço específico
  static async atualizarEndereco(enderecoId, updates, dbArg) {
    const db = dbArg || await initDatabase();
    const campos = [];
    const valores = [];

    const colunasPermitidas = {
      uf: 'uf',
      logradouro: 'logradouro',
      numero: 'numero',
      bairro: 'bairro',
      cidade: 'cidade',
      complemento: 'complemento',
      obs: 'obs',
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
  static async removerEndereco(enderecoId, dbArg) {
    const db = dbArg || await initDatabase();
    const resultado = await db.run('DELETE FROM enderecos WHERE id = ?', [enderecoId]);
    return resultado.changes > 0;
  }

  // Obtém todos os telefones de uma pessoa
  static async obterTelefonesPorPessoa(pessoaId, dbArg) {
    const db = dbArg || await initDatabase();
    return db.all(
      'SELECT id, numero FROM telefones WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  // Adiciona um novo telefone para uma pessoa
  static async adicionarTelefone(pessoaId, numero, dbArg) {
    const db = dbArg || await initDatabase();
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
  static async atualizarTelefone(telefoneId, numero, dbArg) {
    const db = dbArg || await initDatabase();
    const agora = new Date().toISOString();

    const resultado = await db.run(
      `UPDATE telefones SET numero = ?, atualizadoEm = ? WHERE id = ?`,
      [numero, agora, telefoneId]
    );

    return resultado.changes > 0;
  }

  // Remove um telefone específico
  static async removerTelefone(telefoneId, dbArg) {
    const db = dbArg || await initDatabase();
    const resultado = await db.run('DELETE FROM telefones WHERE id = ?', [telefoneId]);
    return resultado.changes > 0;
  }

  // Emails
  static async obterEmailsPorPessoa(pessoaId, dbArg) {
    const db = dbArg || await initDatabase();
    return db.all(
      'SELECT id, email FROM emails WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  static async adicionarEmail(pessoaId, email, dbArg) {
    const db = dbArg || await initDatabase();
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

  static async removerEmail(emailId, dbArg) {
    const db = dbArg || await initDatabase();
    const resultado = await db.run('DELETE FROM emails WHERE id = ?', [emailId]);
    return resultado.changes > 0;
  }

  // Redes sociais
  static async obterRedesPorPessoa(pessoaId, dbArg) {
    const db = dbArg || await initDatabase();
    return db.all(
      'SELECT id, perfil FROM redes_sociais WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  static async sincronizarRedesSociais(pessoaId, redesSociais, dbArg) {
    const db = dbArg || await initDatabase();
    const agora = new Date().toISOString();
    const existentes = await db.all(
      'SELECT id, perfil FROM redes_sociais WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
    const usados = new Set();
    const resultado = [];

    for (const perfil of redesSociais) {
      const texto = String(perfil || '').trim();
      if (!texto) continue;
      const encontrado = existentes.find((r) => r.perfil === texto && !usados.has(r.id));
      if (encontrado) {
        usados.add(encontrado.id);
        resultado.push({ id: encontrado.id, perfil: encontrado.perfil });
      } else {
        const novo = {
          id: randomUUID(),
          pessoa_id: pessoaId,
          perfil: texto,
          criadoEm: agora,
          atualizadoEm: agora,
        };
        await db.run(
          `INSERT INTO redes_sociais (id, pessoa_id, perfil, criadoEm, atualizadoEm) VALUES (?, ?, ?, ?, ?)` ,
          [novo.id, novo.pessoa_id, novo.perfil, novo.criadoEm, novo.atualizadoEm]
        );
        resultado.push({ id: novo.id, perfil: novo.perfil });
      }
    }

    for (const existente of existentes) {
      if (!usados.has(existente.id)) {
        await db.run('DELETE FROM redes_sociais WHERE id = ?', [existente.id]);
      }
    }

    return resultado;
  }

  static async adicionarRedeSocial(pessoaId, perfil, dbArg) {
    const db = dbArg || await initDatabase();
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

  static async removerRedeSocial(redeId, dbArg) {
    const db = dbArg || await initDatabase();
    const resultado = await db.run('DELETE FROM redes_sociais WHERE id = ?', [redeId]);
    return resultado.changes > 0;
  }

  // Fotos vinculadas a uma pessoa
  static async obterFotosPorPessoa(pessoaId, dbArg) {
    const db = dbArg || await initDatabase();
    const registros = await db.all(
      // Comentário: aplicamos alias para manter o padrão camelCase antes do mapeamento
      'SELECT id, nome_arquivo AS nomeArquivo, caminho, mime_type AS mimeType, tamanho FROM fotos_pessoas WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
    return registros.map((foto) => ({
      ...foto,
      nome_arquivo: foto.nomeArquivo,
      mime_type: foto.mimeType,
      url: gerarUrlPublica(foto.caminho),
    }));
  }

  // Imagens de redes sociais: QR (único) e Perfil (múltiplas)
  static async obterImagensRedesPorPessoa(pessoaId, redesArg, dbArg) {
    const db = dbArg || await initDatabase();
    const redes = Array.isArray(redesArg) ? redesArg : await this.obterRedesPorPessoa(pessoaId, db);
    const mapaIndices = new Map(redes.map((r, index) => [r.id, index]));
    const registros = await db.all(
      'SELECT id, pessoa_id as pessoaId, rede_social_id as redeSocialId, tipo, nome_arquivo AS nomeArquivo, caminho, mime_type AS mimeType, tamanho, criadoEm, atualizadoEm FROM pessoas_redes_imagens WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
    const mapeados = registros.map((r) => ({
      ...r,
      url: gerarUrlPublica(r.caminho),
      nome_arquivo: r.nomeArquivo,
      mime_type: r.mimeType,
    }));
    const grupos = new Map();

    for (const item of mapeados) {
      const redeSocialId = item.redeSocialId || null;
      const key = redeSocialId || '__sem_rede__';
      if (!grupos.has(key)) {
        const redeInfo = redeSocialId ? redes.find((r) => r.id === redeSocialId) : null;
        const perfilTexto = redeInfo?.perfil || '';
        const [tipoRede, perfil] = perfilTexto.split('|').map((t) => t.trim());
        grupos.set(key, {
          index: redeSocialId ? (mapaIndices.get(redeSocialId) ?? null) : null,
          redeSocialId,
          tipoRede: tipoRede || null,
          perfil: perfil || null,
          qrCode: null,
          perfis: [],
        });
      }
      const grupo = grupos.get(key);
      if (item.tipo === 'qr') {
        grupo.qrCode = item;
      } else if (item.tipo === 'perfil') {
        grupo.perfis.push(item);
      }
    }

    return Array.from(grupos.values()).sort((a, b) => {
      const idxA = Number.isInteger(a.index) ? a.index : Number.MAX_SAFE_INTEGER;
      const idxB = Number.isInteger(b.index) ? b.index : Number.MAX_SAFE_INTEGER;
      return idxA - idxB;
    });
  }

  static async adicionarImagemRede(pessoaId, img, tipo, redeSocialId, dbArg) {
    const db = dbArg || await initDatabase();
    const agora = new Date().toISOString();
    const registro = {
      id: randomUUID(),
      pessoa_id: pessoaId,
      rede_social_id: redeSocialId || null,
      tipo,
      nome_arquivo: img.nomeOriginal || null,
      caminho: img.caminho,
      mime_type: img.mimeType || null,
      tamanho: img.tamanho || null,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await db.run(
      `INSERT INTO pessoas_redes_imagens (id, pessoa_id, rede_social_id, tipo, nome_arquivo, caminho, mime_type, tamanho, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [registro.id, registro.pessoa_id, registro.rede_social_id, registro.tipo, registro.nome_arquivo, registro.caminho, registro.mime_type, registro.tamanho, registro.criadoEm, registro.atualizadoEm]
    );
    return { ...registro, nomeArquivo: registro.nome_arquivo, mimeType: registro.mime_type, url: gerarUrlPublica(registro.caminho) };
  }

  static async setQrCode(pessoaId, img, redeSocialId, dbArg) {
    const db = dbArg || await initDatabase();
    // Remove QR anterior (se existir) para a mesma rede
    const { sql, params } = (() => {
      if (redeSocialId) {
        return {
          sql: 'SELECT id, caminho FROM pessoas_redes_imagens WHERE pessoa_id = ? AND tipo = ? AND rede_social_id = ? LIMIT 1',
          params: [pessoaId, 'qr', redeSocialId],
        };
      }
      return {
        sql: 'SELECT id, caminho FROM pessoas_redes_imagens WHERE pessoa_id = ? AND tipo = ? AND rede_social_id IS NULL LIMIT 1',
        params: [pessoaId, 'qr'],
      };
    })();
    const atual = await db.get(sql, params);
    if (atual) {
      await db.run('DELETE FROM pessoas_redes_imagens WHERE id = ?', [atual.id]);
      removerArquivoFisico(atual.caminho);
    }
    return this.adicionarImagemRede(pessoaId, img, 'qr', redeSocialId, db);
  }

  static async removerQrCodePorRede(pessoaId, redeSocialId, dbArg) {
    const db = dbArg || await initDatabase();
    // Comentário: remove QR-CODE vinculado à rede específica
    const { sql, params } = (() => {
      if (redeSocialId) {
        return {
          sql: 'SELECT id, caminho FROM pessoas_redes_imagens WHERE pessoa_id = ? AND tipo = ? AND rede_social_id = ? LIMIT 1',
          params: [pessoaId, 'qr', redeSocialId],
        };
      }
      return {
        sql: 'SELECT id, caminho FROM pessoas_redes_imagens WHERE pessoa_id = ? AND tipo = ? AND rede_social_id IS NULL LIMIT 1',
        params: [pessoaId, 'qr'],
      };
    })();
    const atual = await db.get(sql, params);
    if (!atual) return false;
    await db.run('DELETE FROM pessoas_redes_imagens WHERE id = ?', [atual.id]);
    removerArquivoFisico(atual.caminho);
    return true;
  }

  static async atualizarVinculoRedeImagem(imagemId, redeSocialId, dbArg) {
    const db = dbArg || await initDatabase();
    const resultado = await db.run(
      'UPDATE pessoas_redes_imagens SET rede_social_id = ?, atualizadoEm = ? WHERE id = ?',
      [redeSocialId || null, new Date().toISOString(), imagemId]
    );
    return resultado.changes > 0;
  }

  static async removerImagemRede(imagemId, dbArg) {
    const db = dbArg || await initDatabase();
    const img = await db.get('SELECT caminho FROM pessoas_redes_imagens WHERE id = ?', [imagemId]);
    if (!img) return false;
    const resultado = await db.run('DELETE FROM pessoas_redes_imagens WHERE id = ?', [imagemId]);
    if (resultado.changes > 0) removerArquivoFisico(img.caminho);
    return resultado.changes > 0;
  }

  static async removerImagensRedesPorPessoa(pessoaId, dbArg) {
    const db = dbArg || await initDatabase();
    const todas = await db.all('SELECT id FROM pessoas_redes_imagens WHERE pessoa_id = ?', [pessoaId]);
    for (const r of todas) {
      await this.removerImagemRede(r.id, db);
    }
  }

  static async removerImagensRedesPorPessoaForaDeRedes(pessoaId, redeIds, dbArg) {
    const db = dbArg || await initDatabase();
    if (!Array.isArray(redeIds)) return;
    if (!redeIds.length) {
      await this.removerImagensRedesPorPessoa(pessoaId, db);
      return;
    }
    const placeholders = redeIds.map(() => '?').join(', ');
    const registros = await db.all(
      `SELECT id FROM pessoas_redes_imagens WHERE pessoa_id = ? AND (rede_social_id IS NULL OR rede_social_id NOT IN (${placeholders}))`,
      [pessoaId, ...redeIds]
    );
    for (const registro of registros) {
      await this.removerImagemRede(registro.id, db);
    }
  }

  static async adicionarFoto(pessoaId, foto, dbArg) {
    const db = dbArg || await initDatabase();
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

    // Comentário: devolvemos também o alias em camelCase para consumo direto no frontend
    return {
      ...novaFoto,
      nomeArquivo: novaFoto.nome_arquivo,
      mimeType: novaFoto.mime_type,
      url: gerarUrlPublica(novaFoto.caminho),
    };
  }

  static async removerFoto(fotoId, dbArg) {
    const db = dbArg || await initDatabase();
    const foto = await db.get('SELECT caminho FROM fotos_pessoas WHERE id = ?', [fotoId]);
    if (!foto) return false;

    const resultado = await db.run('DELETE FROM fotos_pessoas WHERE id = ?', [fotoId]);
    if (resultado.changes > 0) {
      removerArquivoFisico(foto.caminho);
    }
    return resultado.changes > 0;
  }

  static async removerFotosPorPessoa(pessoaId, dbArg) {
    const fotos = await this.obterFotosPorPessoa(pessoaId, dbArg);
    for (const foto of fotos) {
      await this.removerFoto(foto.id, dbArg);
    }
  }

  // Vínculos > Pessoas
  static async obterVinculosPessoas(pessoaId, dbArg) {
    const db = dbArg || await initDatabase();
    return db.all(
      'SELECT id, nome, cpf, tipo FROM vinculos_pessoas WHERE pessoa_id = ? ORDER BY criadoEm ASC',
      [pessoaId]
    );
  }

  static async adicionarVinculoPessoa(pessoaId, vinc, dbArg) {
    const db = dbArg || await initDatabase();
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

  static async removerVinculoPessoa(vinculoId, dbArg) {
    const db = dbArg || await initDatabase();
    const resultado = await db.run('DELETE FROM vinculos_pessoas WHERE id = ?', [vinculoId]);
    return resultado.changes > 0;
  }

  // Empresa e Sócios
  static async obterEmpresaPorPessoa(pessoaId, dbArg) {
    const db = dbArg || await initDatabase();
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

  static async upsertEmpresa(pessoaId, empresa, dbArg) {
    const db = dbArg || await initDatabase();
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

    return this.obterEmpresaPorPessoa(pessoaId, db);
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
      'sinais',
      'faccao_id',
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
    await this.removerImagensRedesPorPessoa(id);
    const resultado = await db.run('DELETE FROM pessoas WHERE id = ?', [id]);
    return resultado.changes > 0;
  }
}

module.exports = PessoaModel;
