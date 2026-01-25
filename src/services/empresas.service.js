const EmpresaModel = require('../models/empresas.model');
const { criarErro } = require('../utils/helpers');
const path = require('path');
const { validarFotosUpload, extrairArquivosCampo } = require('../utils/validators');

function mapearFotosEmpresas(arquivos) {
  const baseDir = path.join(__dirname, '../../public');
  return validarFotosUpload(arquivos).map((foto) => ({
    ...foto,
    caminho: foto.caminho.replace(baseDir.replace(/\\/g, '/'), '').replace(/^\//, ''),
  }));
}

function sanitizeEmpresa(payload, options = {}) {
  // Comentário: permite preservar ausência de "veiculos" em payloads de atualização.
  const preservarVeiculosAusentes = options.preservarVeiculosAusentes === true;
  // Comentário: aceita chaves alternativas para observações e garante inclusão em updates parciais.
  const chavesObs = ['obs', 'observacoes', 'observacao'];
  const chaveObsEncontrada = chavesObs.find((chave) => Object.prototype.hasOwnProperty.call(payload, chave));
  const possuiObs = Boolean(chaveObsEncontrada);
  const cnpjDigits = String(payload.cnpj || '').replace(/\D/g, '');
  const telefone = String(payload.telefone || '').trim();
  const razaoSocial = payload.razaoSocial ? String(payload.razaoSocial).trim() : '';
  const nomeFantasia = payload.nomeFantasia ? String(payload.nomeFantasia).trim() : '';
  const obsBruta = possuiObs ? payload[chaveObsEncontrada] : '';
  const obs = obsBruta ? String(obsBruta).trim() : '';
  // Campos que podem chegar como JSON string quando enviados via FormData
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

  const sociosBrutos = parseListaCampo(payload.socios);
  const socios = Array.isArray(sociosBrutos)
    ? sociosBrutos.map((s) => ({
        nome: String(s?.nome || '').trim(),
        cpf: String(s?.cpf || '').replace(/\D/g, ''),
      })).filter((s) => s.nome || s.cpf)
    : [];
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
          // Comentário: força proprietário e documento usando os dados principais da empresa (Razão Social e CNPJ).
          const nomeProprietario = String(razaoSocial || '').trim();
          const cnpj = String(cnpjDigits || '').replace(/\D/g, '');
          // Comentário: inclui CPF derivado do CNPJ para compatibilidade com a API de veículos.
          const cpf = cnpj || null;
          return { placa, marcaModelo, cor, anoModelo, nomeProprietario, cnpj, cpf };
        })
        .filter((v) => (v.placa && v.nomeProprietario))
    : [];

  const resultado = {
    cnpj: cnpjDigits || null,
    razaoSocial: razaoSocial || null,
    nomeFantasia: nomeFantasia || null,
    naturezaJuridica: payload.naturezaJuridica ? String(payload.naturezaJuridica).trim() : null,
    dataInicioAtividade: payload.dataInicioAtividade || null,
    situacaoCadastral: payload.situacaoCadastral || null,
    telefone: telefone || null,
    // Comentário: valida e normaliza endereços, aceitando JSON string quando necessário.
    enderecos: require('../utils/validators').validarEnderecos(payload.enderecos),
    socios,
  };

  if (possuiObs) {
    resultado.obs = obs || null;
  }

  // Comentário: só inclui "veiculos" quando o payload realmente enviou essa seção.
  if (!preservarVeiculosAusentes || temVeiculos) {
    resultado.veiculos = veiculosNormalizados;
  }

  // Comentário: fotos de empresas são opcionais e atualizadas fora deste sanitizador quando necessário
  return resultado;
}

async function criar(payload, arquivos = {}) {
  const dados = sanitizeEmpresa(payload || {});
  const fotosUpload = mapearFotosEmpresas(extrairArquivosCampo(arquivos, 'fotos'));
  if (fotosUpload.length) {
    dados.fotos = fotosUpload;
  }
  // Regras mínimas: aceitar cadastro mesmo sem CNPJ; opcionalmente exigir razaoSocial
  // if (!dados.razaoSocial) throw criarErro('Razão Social é obrigatória.', 400);
  return EmpresaModel.create(dados);
}

async function listar(filtros = {}) {
  // Comentário: busca todas as empresas e aplica filtros opcionais em memória para permitir pesquisa rápida.
  const empresas = await EmpresaModel.findAll();
  const normalizarTexto = (v) => String(v || '').toLowerCase();
  const somenteDigitos = (v) => String(v || '').replace(/\D/g, '');

  const filtroCnpj = somenteDigitos(filtros.cnpj);
  const filtroRazao = normalizarTexto(filtros.razaoSocial || filtros.nomeFantasia);
  const filtroSocioTexto = normalizarTexto(filtros.socio);
  const filtroSocioDigitos = somenteDigitos(filtros.socio);
  const filtroEnderecoTexto = normalizarTexto(filtros.endereco);
  const filtroCep = somenteDigitos(filtros.cep);
  const filtroObs = normalizarTexto(filtros.obs);

  const temFiltro = filtroCnpj || filtroRazao || filtroSocioTexto || filtroSocioDigitos || filtroEnderecoTexto || filtroCep || filtroObs;
  if (!temFiltro) return empresas;

  return empresas.filter((empresa) => {
    const cnpjEmpresa = somenteDigitos(empresa.cnpj);
    const razao = normalizarTexto(empresa.razaoSocial);
    const fantasia = normalizarTexto(empresa.nomeFantasia);
    const obs = normalizarTexto(empresa.obs);

    const cnpjAtende = filtroCnpj ? cnpjEmpresa.includes(filtroCnpj) : true;
    const razaoAtende = filtroRazao ? (razao.includes(filtroRazao) || fantasia.includes(filtroRazao)) : true;

    const socios = Array.isArray(empresa.socios) ? empresa.socios : [];
    const socioAtende = (filtroSocioTexto || filtroSocioDigitos)
      ? socios.some((s) => {
          const nomeSocio = normalizarTexto(s.nome);
          const cpfSocio = somenteDigitos(s.cpf);
          return (
            (filtroSocioTexto && nomeSocio.includes(filtroSocioTexto)) ||
            (filtroSocioDigitos && cpfSocio.includes(filtroSocioDigitos))
          );
        })
      : true;

    const enderecosArr = Array.isArray(empresa.enderecos) ? empresa.enderecos : [];
    const enderecoTextoAtende = filtroEnderecoTexto
      ? enderecosArr.some((e) => {
          const uf = normalizarTexto(e.uf);
          const logradouro = normalizarTexto(e.logradouro);
          const bairro = normalizarTexto(e.bairro);
          const complemento = normalizarTexto(e.complemento);
          return (
            uf.includes(filtroEnderecoTexto) ||
            logradouro.includes(filtroEnderecoTexto) ||
            bairro.includes(filtroEnderecoTexto) ||
            complemento.includes(filtroEnderecoTexto)
          );
        })
      : true;

    const cepAtende = filtroCep
      ? enderecosArr.some((e) => somenteDigitos(e.cep).includes(filtroCep))
      : true;

    const obsAtende = filtroObs ? obs.includes(filtroObs) : true;

    return cnpjAtende && razaoAtende && socioAtende && enderecoTextoAtende && cepAtende && obsAtende;
  });
}

async function buscarPorId(id) {
  const emp = await EmpresaModel.findById(id);
  if (!emp) throw criarErro('Empresa não encontrada', 404);
  return emp;
}

async function atualizar(id, payload, arquivos = {}) {
  const existente = await EmpresaModel.findById(id);
  if (!existente) throw criarErro('Empresa não encontrada', 404);
  const payloadNormalizado = payload ? { ...payload } : {};
  // Comentário: se o payload não trouxe razão social ou CNPJ, usa os dados existentes antes de normalizar veículos.
  if (!Object.prototype.hasOwnProperty.call(payloadNormalizado, 'razaoSocial')) {
    payloadNormalizado.razaoSocial = existente.razaoSocial;
  }
  if (!Object.prototype.hasOwnProperty.call(payloadNormalizado, 'cnpj')) {
    payloadNormalizado.cnpj = existente.cnpj;
  }
  const updates = sanitizeEmpresa(payloadNormalizado, { preservarVeiculosAusentes: true });

  const fotosUpload = mapearFotosEmpresas(extrairArquivosCampo(arquivos, 'fotos'));

  // Processa fotos existentes e remoções semelhantes ao fluxo de Pessoas
  const existentes = Array.isArray(existente.fotos) ? existente.fotos : [];

  // Normaliza lista de IDs a remover
  let idsRemover = [];
  if (payload.fotosParaRemover !== undefined) {
    const bruto = payload.fotosParaRemover;
    if (Array.isArray(bruto)) {
      idsRemover = bruto.map((v) => String(v).trim()).filter(Boolean);
    } else if (typeof bruto === 'string' && bruto.trim()) {
      try {
        const parsed = JSON.parse(bruto);
        if (Array.isArray(parsed)) {
          idsRemover = parsed.map((v) => String(v).trim()).filter(Boolean);
        }
      } catch (_) {
        idsRemover = bruto.split(',').map((v) => String(v).trim()).filter(Boolean);
      }
    }
  }

  // Normaliza lista de fotos existentes a manter (enviadas pelo frontend)
  let idsManter = null;
  if (payload.fotosExistentes !== undefined) {
    let lista = payload.fotosExistentes;
    if (typeof lista === 'string') {
      try {
        lista = JSON.parse(lista);
      } catch (_) {
        lista = [];
      }
    }
    if (Array.isArray(lista)) {
      idsManter = lista
        .map((item) => (item && typeof item === 'object' ? (item.referencia || item.id) : item))
        .map((v) => String(v || '').trim())
        .filter(Boolean);
    }
  }

  const removerSet = new Set(idsRemover);
  let manterSet;
  if (idsManter && idsManter.length) {
    manterSet = new Set(idsManter.filter((id) => !removerSet.has(id)));
  } else if (payload.fotosParaRemover !== undefined) {
    // Se apenas fotosParaRemover foi enviado, mantemos todas as outras existentes
    manterSet = new Set(
      existentes
        .map((f) => String(f.id || '').trim())
        .filter((id) => id && !removerSet.has(id)),
    );
  }

  if (manterSet) {
    const fotosMantidas = existentes
      .filter((f) => manterSet.has(String(f.id || '').trim()))
      .map((f) => ({
        id: f.id,
        nomeArquivo: f.nomeArquivo || f.nome_arquivo || null,
        caminho: f.caminho,
        mimeType: f.mimeType || f.mime_type || null,
        tamanho: f.tamanho || null,
      }));

    updates.fotos = [...fotosMantidas, ...fotosUpload];
  } else if (fotosUpload.length) {
    // Apenas novas fotos (nenhum controle explícito de existentes)
    updates.fotos = [...fotosUpload, ...existentes.map((f) => ({
      id: f.id,
      nomeArquivo: f.nomeArquivo || f.nome_arquivo || null,
      caminho: f.caminho,
      mimeType: f.mimeType || f.mime_type || null,
      tamanho: f.tamanho || null,
    }))];
  } else if (payload.fotosParaRemover !== undefined) {
    // Remoção total opcional quando lista vazia é enviada
    if (idsRemover.length && !existentes.some((f) => !removerSet.has(String(f.id || '').trim()))) {
      updates.fotos = [];
    }
  }

  return EmpresaModel.update(id, updates);
}

async function remover(id) {
  const existente = await EmpresaModel.findById(id);
  if (!existente) throw criarErro('Empresa não encontrada', 404);
  await EmpresaModel.delete(id);
  return true;
}

module.exports = { criar, listar, buscarPorId, atualizar, remover };
