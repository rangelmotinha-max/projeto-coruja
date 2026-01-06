const PessoaModel = require('../models/pessoas.model');
const { criarErro } = require('../utils/helpers');
const { validarCadastroPessoa, validarAtualizacaoPessoa, validarCadastroVeiculo } = require('../utils/validators');
const FaccaoModel = require('../models/faccoes.model');

// Resolve facção opcional criando nova entrada quando necessário
async function resolverFaccaoAssociada({ faccaoId, faccaoNome }) {
  const nomeLimpo = (faccaoNome || '').trim();
  const idLimpo = (faccaoId || '').trim();

  if (idLimpo) {
    const existente = await FaccaoModel.findById(idLimpo);
    if (existente) return existente.id;
  }

  if (nomeLimpo) {
    const existentePorNome = await FaccaoModel.findByNomeOuSigla(nomeLimpo);
    if (existentePorNome) return existentePorNome.id;

    const criada = await FaccaoModel.create({ nome: nomeLimpo, sigla: nomeLimpo.toUpperCase() });
    return criada.id;
  }

  return null;
}

// Serviços de negócio para Pessoas encapsulando validações e regras.
async function criar(payload, arquivos = []) {
  // Validação centralizada garante integridade antes da persistência.
  const dados = validarCadastroPessoa(payload, arquivos);
  dados.faccaoId = await resolverFaccaoAssociada({ faccaoId: dados.faccaoId, faccaoNome: dados.faccaoNome });
  delete dados.faccaoNome;
  return PessoaModel.create(dados);
}

function normalizarFiltros(filtrosBrutos = {}) {
  // Remove espaços extras e permite usar diferentes chaves de consulta.
  const limpar = (valor) => (typeof valor === 'string' ? valor.trim() : '');

  const filtros = {};

  // Nome ou apelido: aceita "nome", "apelido" ou "nome_apelido".
  const nomeOuApelido = limpar(filtrosBrutos.nome) || limpar(filtrosBrutos.apelido) || limpar(filtrosBrutos.nome_apelido);
  if (nomeOuApelido) filtros.nomeOuApelido = nomeOuApelido;

  // Documento: CPF/RG/CNH.
  const documento = limpar(filtrosBrutos.documento);
  if (documento) filtros.documento = documento;

  // Data de nascimento aceita formatos livres para compatibilidade.
  const dataNascimento = limpar(filtrosBrutos.data_nascimento || filtrosBrutos.dataNascimento);
  if (dataNascimento) filtros.dataNascimento = dataNascimento;

  // Nome da mãe.
  const mae = limpar(filtrosBrutos.mae || filtrosBrutos.nomeMae);
  if (mae) filtros.nomeMae = mae;

  // Nome do pai.
  const pai = limpar(filtrosBrutos.pai || filtrosBrutos.nomePai);
  if (pai) filtros.nomePai = pai;

  // Sinais ou características físicas para filtrar cadastros
  const sinais = limpar(filtrosBrutos.sinais);
  if (sinais) filtros.sinais = sinais;

  // Facção/organização criminosa vinculada
  const faccaoId = limpar(filtrosBrutos.faccaoId || filtrosBrutos.faccao_id);
  if (faccaoId) filtros.faccaoId = faccaoId;
  const faccaoNome = limpar(filtrosBrutos.faccao || filtrosBrutos.faccaoNome);
  if (faccaoNome) filtros.faccaoNome = faccaoNome;

  // Telefone vinculado.
  const telefone = limpar(filtrosBrutos.telefone);
  if (telefone) filtros.telefone = telefone;

  // Email vinculado.
  const email = limpar(filtrosBrutos.email);
  if (email) filtros.email = email;

  // Termo amplo para pesquisa em todos os campos disponíveis.
  const pesquisaGeral = limpar(filtrosBrutos.pesquisaGeral || filtrosBrutos.q || filtrosBrutos.busca);
  if (pesquisaGeral) filtros.pesquisaGeral = pesquisaGeral;

  return filtros;
}

async function listar() {
  return PessoaModel.findAll();
}

async function buscar(filtrosBrutos) {
  // Interpreta os filtros enviados na querystring e delega para o modelo.
  const filtros = normalizarFiltros(filtrosBrutos);
  return PessoaModel.findByFilters(filtros);
}

async function buscarPorId(id) {
  const pessoa = await PessoaModel.findById(id);
  if (!pessoa) throw criarErro('Pessoa não encontrada', 404);
  return pessoa;
}

async function atualizar(id, payload, arquivos = []) {
  const {
    fotos = [],
    fotosParaRemover = [],
    enderecos,
    telefones,
    emails,
    redesSociais,
    qrCode,
    imagensPerfil = [],
    redesPerfisParaRemover = [],
    removerQrCode = false,
    vinculos,
    ocorrencias,
    veiculo,
    veiculos,
    ...atualizacoes
  } = validarAtualizacaoPessoa(payload, arquivos);
  const existente = await PessoaModel.findById(id);
  if (!existente) throw criarErro('Pessoa não encontrada', 404);

  if (atualizacoes.faccao_id !== undefined || atualizacoes.faccaoNome) {
    atualizacoes.faccao_id = await resolverFaccaoAssociada({
      faccaoId: atualizacoes.faccao_id,
      faccaoNome: atualizacoes.faccaoNome,
    });
    delete atualizacoes.faccaoNome;
  }

  // Processar endereços validados, mantendo limpeza consistente antes de regravar.
  const enderecosValidados = Array.isArray(enderecos) ? enderecos.filter(Boolean) : null;
  if (enderecosValidados) {
    // Obter endereços atuais para decidir remoções.
    const enderecosAtuais = await PessoaModel.obterEnderecosPorPessoa(id);

    // Remover endereços que não estão mais aprovados pelo validador.
    for (const enderecoAtual of enderecosAtuais) {
      const existe = enderecosValidados.some((e) => e.id === enderecoAtual.id);
      if (!existe) {
        await PessoaModel.removerEndereco(enderecoAtual.id);
      }
    }

    // Adicionar novos ou atualizar existentes apenas com dados filtrados.
    for (const endereco of enderecosValidados) {
      if (endereco.id) {
        // Atualizar endereço existente validado.
        await PessoaModel.atualizarEndereco(endereco.id, endereco);
      } else {
        // Adicionar novo endereço validado.
        await PessoaModel.adicionarEndereco(id, endereco);
      }
    }
  }

  // Processar telefones validados com limpeza total antes da inserção.
  const telefonesValidados = Array.isArray(telefones) ? telefones.filter(Boolean) : null;
  if (telefonesValidados) {
    const telefonesAtuais = await PessoaModel.obterTelefonesPorPessoa(id);
    for (const telefoneAtual of telefonesAtuais) {
      await PessoaModel.removerTelefone(telefoneAtual.id);
    }

    for (const telefone of telefonesValidados) {
      await PessoaModel.adicionarTelefone(id, telefone);
    }
  }

  // Processar emails validados com remoção total prévia.
  const emailsValidados = Array.isArray(emails) ? emails.filter(Boolean) : null;
  if (emailsValidados) {
    const emailsAtuais = await PessoaModel.obterEmailsPorPessoa(id);
    for (const emailAtual of emailsAtuais) {
      await PessoaModel.removerEmail(emailAtual.id);
    }
    for (const email of emailsValidados) {
      await PessoaModel.adicionarEmail(id, email);
    }
  }

  // Processar redes sociais validadas garantindo limpeza antes de regravar.
  const redesValidadas = Array.isArray(redesSociais) ? redesSociais.filter(Boolean) : null;
  if (redesValidadas) {
    const redesAtuais = await PessoaModel.obterRedesPorPessoa(id);
    for (const redeAtual of redesAtuais) {
      await PessoaModel.removerRedeSocial(redeAtual.id);
    }
    for (const perfil of redesValidadas) {
      await PessoaModel.adicionarRedeSocial(id, perfil);
    }
  }

  // Empresa removida do cadastro de Pessoas; nenhum processamento aqui

  // Processar vínculos validados (pessoas relacionadas) sempre após limpeza.
  const vinculosValidados = Array.isArray(vinculos?.pessoas)
    ? vinculos.pessoas.filter(Boolean)
    : [];
  const deveRemoverVinculos = vinculos === undefined || vinculos === null || Array.isArray(vinculos?.pessoas);
  if (deveRemoverVinculos) {
    // Comentário: se o payload omitir ou enviar listas vazias, entendemos como solicitação explícita de limpeza
    const atuais = await PessoaModel.obterVinculosPessoas(id);
    for (const v of atuais) {
      await PessoaModel.removerVinculoPessoa(v.id);
    }
  }
  for (const vp of vinculosValidados) {
    if ((vp.nome || vp.cpf || vp.tipo || '').toString().trim().length) {
      await PessoaModel.adicionarVinculoPessoa(id, vp);
    }
  }

  // Remover fotos solicitadas antes de adicionar novas
  for (const fotoId of fotosParaRemover) {
    await PessoaModel.removerFoto(fotoId);
  }

  for (const foto of fotos) {
    await PessoaModel.adicionarFoto(id, foto);
  }

  // Atualizar imagens de redes sociais
  // Remover perfis solicitados
  for (const imgId of redesPerfisParaRemover) {
    await PessoaModel.removerImagemRede(imgId);
  }
  // Substituir QR-CODE se enviado novo
  if (qrCode) {
    await PessoaModel.setQrCode(id, qrCode);
  } else if (removerQrCode) {
    // Remover QR atual se solicitado explicitamente
    const atual = await PessoaModel.obterImagensRedesPorPessoa(id);
    if (atual?.qrCode?.id) await PessoaModel.removerImagemRede(atual.qrCode.id);
  }
  // Adicionar novas imagens de perfil
  for (const img of imagensPerfil) {
    await PessoaModel.adicionarImagemRede(id, img, 'perfil');
  }

  // Atualizar dados da pessoa e índice do endereço atual validados.
  if (atualizacoes.endereco_atual_index !== undefined) {
    atualizacoes.endereco_atual_index = atualizacoes.endereco_atual_index;
  }

  // Persistir estruturas complexas via JSON
  const listasVinculos = vinculos && typeof vinculos === 'object'
    ? Object.values(vinculos).filter(Array.isArray)
    : [];
  const semVinculosInformados = vinculos === undefined
    || vinculos === null
    || listasVinculos.every((lista) => lista.length === 0);
  if (semVinculosInformados) {
    // Comentário: ausência de vínculos deve limpar tanto a tabela quanto o JSON persistido
    atualizacoes.vinculos_json = null;
  } else if (vinculos) {
    atualizacoes.vinculos_json = JSON.stringify(vinculos);
  }
  if (ocorrencias) {
    // Remoção física de imagens de monitoramento que deixaram de ser referenciadas
    try {
      const coletarImagens = (oc) => {
        if (!oc || typeof oc !== 'object') return [];
        const lista = Array.isArray(oc.monitoramentos) ? oc.monitoramentos : [];
        const imagens = [];
        for (const m of lista) {
          const arr = Array.isArray(m?.imagens) ? m.imagens : [];
          for (const img of arr) {
            const caminho = String(img?.caminho || '').trim();
            if (caminho) imagens.push(caminho);
          }
        }
        return imagens;
      };

      const anteriores = coletarImagens(existente.ocorrencias);
      const novas = coletarImagens(ocorrencias);
      const setNovas = new Set(novas);
      const remover = anteriores.filter((c) => !setNovas.has(c));

      if (remover.length) {
        const path = require('path');
        const fs = require('fs');
        const publicDir = path.join(__dirname, '../../public');
        for (const caminhoRel of remover) {
          const absoluto = path.join(publicDir, caminhoRel.replace(/^[\\/]+/, ''));
          fs.promises.unlink(absoluto).catch(() => {});
        }
      }
    } catch {}

    atualizacoes.ocorrencias_json = JSON.stringify(ocorrencias);
  }

  const atualizada = await PessoaModel.update(id, atualizacoes);

  // Sincroniza veículos associados quando solicitado na atualização
  if (veiculos !== undefined && veiculos !== null) {
    const listaValidada = (veiculos || []).map((v) => validarCadastroVeiculo({
      ...v,
      nomeProprietario: v.nomeProprietario || atualizacoes.nomeCompleto || existente.nomeCompleto,
      cpf: v.cpf || atualizacoes.cpf || existente.cpf,
    }));
    const veiculosSincronizados = await PessoaModel.sincronizarVeiculos(atualizada, listaValidada);
    atualizada.veiculos = veiculosSincronizados;
    atualizada.veiculo = veiculosSincronizados[0] || null;
  } else if (veiculo !== undefined && veiculo !== null) {
    const veiculoValidado = validarCadastroVeiculo({
      ...veiculo,
      nomeProprietario: veiculo.nomeProprietario || atualizacoes.nomeCompleto || existente.nomeCompleto,
      cpf: veiculo.cpf || atualizacoes.cpf || existente.cpf,
    });
    const veiculoAtualizado = await PessoaModel.sincronizarVeiculo(atualizada, veiculoValidado);
    atualizada.veiculo = veiculoAtualizado;
  }

  return atualizada;
}

async function remover(id) {
  const existente = await PessoaModel.findById(id);
  if (!existente) throw criarErro('Pessoa não encontrada', 404);

  await PessoaModel.delete(id);
  return true;
}

module.exports = {
  criar,
  listar,
  buscar,
  buscarPorId,
  atualizar,
  remover,
};
