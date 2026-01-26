const { randomUUID } = require('crypto');
const EntidadeModel = require('../models/entidades.model');
const { criarErro } = require('../utils/helpers');

// Normaliza listas garantindo apenas valores preenchidos
function limparLista(valorBruto) {
  if (Array.isArray(valorBruto)) return valorBruto;
  if (typeof valorBruto === 'string') {
    return [valorBruto];
  }
  return [];
}

// Aplica trim em todos os campos de endereço para evitar sujeira no banco
function normalizarEndereco(endereco) {
  if (!endereco) return null;
  const limpar = (v) => (v !== undefined ? String(v || '').trim() : undefined);
  const normalizado = {
    logradouro: limpar(endereco.logradouro) || null,
    bairro: limpar(endereco.bairro) || null,
    cidade: limpar(endereco.cidade) || null,
    uf: limpar(endereco.uf) || null,
    cep: limpar(endereco.cep)?.replace(/\D/g, '') || null,
    complemento: limpar(endereco.complemento) || null,
  };

  const possuiDados = Object.values(normalizado).some((v) => v);
  return possuiDados ? normalizado : null;
}

// Formata telefone retirando caracteres não numéricos
function normalizarTelefone(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 20);
  return digitos || null;
}

// Normaliza lideranças para o formato { nome, cpf }
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

// Normaliza payload de liderança individual com id persistente
function normalizarLideranca(payload = {}) {
  if (!payload || typeof payload !== 'object') return null;
  const nome = payload.nome !== undefined ? String(payload.nome || '').trim() : '';
  const cpf = payload.cpf !== undefined ? String(payload.cpf || '').replace(/\D/g, '') : '';
  const id = payload.id !== undefined ? String(payload.id || '').trim() : '';
  const nomeFinal = nome || null;
  const cpfFinal = cpf || null;
  if (!nomeFinal && !cpfFinal) return null;
  return { id: id || randomUUID(), nome: nomeFinal, cpf: cpfFinal };
}

// Limpa e valida o payload recebido tanto para criação quanto atualização
function sanitizarEntidade(payload, arquivos = [], options = {}) {
  const limparTexto = (v) => (v !== undefined ? String(v || '').trim() : undefined);
  // Comentário: aceita chaves alternativas para observações e garante inclusão em updates parciais.
  const chavesObs = ['obs', 'observacoes', 'observacao'];
  const chaveObsEncontrada = chavesObs.find((chave) => Object.prototype.hasOwnProperty.call(payload, chave));
  const possuiObs = Boolean(chaveObsEncontrada);
  const nome = limparTexto(payload.nome);
  if (payload.nome !== undefined && !nome) {
    throw criarErro('Nome é obrigatório para o cadastro de entidades.', 400);
  }

  const preservarVeiculosAusentes = options.preservarVeiculosAusentes === true;

  const cnpj = limparTexto(payload.cnpj)?.replace(/\D/g, '') || undefined;
  const descricao = limparTexto(payload.descricao);
  const obsBruta = possuiObs ? payload[chaveObsEncontrada] : undefined;
  const obs = obsBruta !== undefined ? String(obsBruta || '').trim() : undefined;

  const liderancas = normalizarLiderancas(payload.liderancas);

  const telefones = limparLista(payload.telefones)
    .map(normalizarTelefone)
    .filter(Boolean);

  const enderecosBrutos = Array.isArray(payload.enderecos) ? payload.enderecos : [];
  const enderecos = enderecosBrutos
    .map(normalizarEndereco)
    .filter(Boolean);

  const parseListaCampo = (valor) => {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor;
    if (typeof valor === 'string') {
      try {
        const parsed = JSON.parse(valor);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  };

  const temVeiculos = Object.prototype.hasOwnProperty.call(payload, 'veiculos');
  const veiculosBrutos = parseListaCampo(payload.veiculos);
  const veiculosNormalizados = Array.isArray(veiculosBrutos)
    ? veiculosBrutos
        .map((v) => {
          const placa = String(v?.placa || '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .trim();
          const marcaModelo = String(v?.marcaModelo || '').trim();
          const cor = String(v?.cor || '').trim();
          const anoModelo = typeof v?.anoModelo === 'number' ? v.anoModelo : (v?.anoModelo ? Number(String(v.anoModelo).replace(/\D/g, '')) || null : null);
          const obs = String(v?.obs || '').trim();
          const nomeProprietario = String(v?.nomeProprietario || nome || '').trim();
          const cnpjVeiculo = String(v?.cnpj || cnpj || '').replace(/\D/g, '');
          return { placa, marcaModelo, cor, anoModelo, obs, nomeProprietario, cnpj: cnpjVeiculo };
        })
        .filter((v) => (v.placa && v.nomeProprietario))
    : [];

  const fotosParaRemover = Array.isArray(payload.fotosParaRemover)
    ? payload.fotosParaRemover
    : [];

  const fotos = (arquivos || []).map((arquivo) => ({
    caminho: arquivo.path,
    nomeOriginal: arquivo.originalname,
    mimeType: arquivo.mimetype,
    tamanho: arquivo.size,
  }));

  return {
    nome,
    cnpj,
    descricao,
    ...(possuiObs ? { obs: obs || null } : {}),
    liderancas,
    telefones,
    enderecos,
    ...((!preservarVeiculosAusentes || temVeiculos) ? { veiculos: veiculosNormalizados } : {}),
    fotos,
    fotosParaRemover,
  };
}

// Aplica filtros simples em memória para facilitar a busca rápida
function filtrarEntidades(lista, filtros = {}) {
  const termo = (filtros.q || filtros.nome || '').toString().toLowerCase().trim();
  const termoLideranca = (filtros.lider || '').toString().toLowerCase().trim();
  const cnpjFiltro = (filtros.cnpj || '').toString().replace(/\D/g, '');
  const telefoneFiltro = (filtros.telefone || '').toString().replace(/\D/g, '');

  return lista.filter((entidade) => {
    const liderancas = Array.isArray(entidade.liderancas) ? entidade.liderancas : [];
    const liderancaCombina = (valor) => {
      const valorTexto = valor.toLowerCase();
      const valorCpf = valor.replace(/\D/g, '');
      return liderancas.some((l) => {
        if (typeof l === 'string') {
          return String(l || '').toLowerCase().includes(valorTexto);
        }
        if (l && typeof l === 'object') {
          const nome = String(l.nome || '').toLowerCase();
          const cpf = String(l.cpf || '').replace(/\D/g, '');
          return nome.includes(valorTexto) || (valorCpf && cpf.includes(valorCpf));
        }
        return false;
      });
    };
    const nomeOuLiderOk = termo
      ? entidade.nome.toLowerCase().includes(termo) || liderancaCombina(termo)
      : true;
    const liderOk = termoLideranca ? liderancaCombina(termoLideranca) : true; // Comentário: permite filtro dedicado para liderança
    const cnpjOk = cnpjFiltro
      ? String(entidade.cnpj || '').replace(/\D/g, '').includes(cnpjFiltro)
      : true;
    const telefoneOk = telefoneFiltro
      ? (entidade.telefones || []).some((t) => String(t.numero || '').includes(telefoneFiltro))
      : true;
    return nomeOuLiderOk && liderOk && cnpjOk && telefoneOk;
  });
}

async function criar(payload, arquivos = []) {
  const dados = sanitizarEntidade(payload, arquivos);
  if (!dados.nome) throw criarErro('Nome é obrigatório para o cadastro de entidades.', 400);
  return EntidadeModel.create(dados);
}

async function listar(filtros = {}) {
  const entidades = await EntidadeModel.findAll();
  return filtrarEntidades(entidades, filtros);
}

async function buscarPorId(id) {
  const entidade = await EntidadeModel.findById(id);
  if (!entidade) throw criarErro('Entidade não encontrada', 404);
  return entidade;
}

async function atualizar(id, payload, arquivos = []) {
  const existente = await EntidadeModel.findById(id);
  if (!existente) throw criarErro('Entidade não encontrada', 404);

  const payloadNormalizado = payload ? { ...payload } : {};
  if (!Object.prototype.hasOwnProperty.call(payloadNormalizado, 'nome')) {
    payloadNormalizado.nome = existente.nome;
  }
  if (!Object.prototype.hasOwnProperty.call(payloadNormalizado, 'cnpj')) {
    payloadNormalizado.cnpj = existente.cnpj;
  }
  const dados = sanitizarEntidade(payloadNormalizado, arquivos, { preservarVeiculosAusentes: true });
  return EntidadeModel.update(id, dados);
}

async function remover(id) {
  const existente = await EntidadeModel.findById(id);
  if (!existente) throw criarErro('Entidade não encontrada', 404);
  await EntidadeModel.delete(id);
  return true;
}

async function listarLiderancas(entidadeId) {
  const liderancas = await EntidadeModel.getLiderancas(entidadeId);
  if (!liderancas) throw criarErro('Entidade não encontrada', 404);
  return liderancas;
}

async function adicionarLideranca(entidadeId, payload) {
  const lideranca = normalizarLideranca(payload);
  if (!lideranca) throw criarErro('Informe ao menos nome ou CPF da liderança.', 400);
  const criada = await EntidadeModel.addLideranca(entidadeId, lideranca);
  if (!criada) throw criarErro('Entidade não encontrada', 404);
  return criada;
}

async function atualizarLideranca(entidadeId, liderancaId, payload) {
  const lideranca = normalizarLideranca({ ...payload, id: liderancaId });
  if (!lideranca) throw criarErro('Informe ao menos nome ou CPF da liderança.', 400);
  const atualizada = await EntidadeModel.updateLideranca(entidadeId, liderancaId, lideranca);
  if (atualizada === null) throw criarErro('Entidade não encontrada', 404);
  if (!atualizada) throw criarErro('Liderança não encontrada', 404);
  return atualizada;
}

async function removerLideranca(entidadeId, liderancaId) {
  const removida = await EntidadeModel.removeLideranca(entidadeId, liderancaId);
  if (removida === null) throw criarErro('Entidade não encontrada', 404);
  if (!removida) throw criarErro('Liderança não encontrada', 404);
  return true;
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  atualizar,
  remover,
  listarLiderancas,
  adicionarLideranca,
  atualizarLideranca,
  removerLideranca,
};
