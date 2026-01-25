const path = require('path');
const { normalizarEmail, criarErro } = require('./helpers');
const fs = require('fs');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAMANHO_MAX_FOTO = 5 * 1024 * 1024; // 5MB
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const BASE_UPLOAD_DIR = path.join(__dirname, '../../public');

function validarEmail(email) {
  const normalizado = normalizarEmail(email);
  if (!normalizado || !emailRegex.test(normalizado)) {
    throw criarErro('E-mail inválido', 400);
  }
  return normalizado;
}

function validarSenha(senha) {
  if (!senha || senha.length < 6) {
    throw criarErro('A senha deve ter pelo menos 6 caracteres', 400);
  }
  return senha;
}

function validarNome(nome) {
  const texto = String(nome || '').trim();
  if (texto.length < 2) {
    throw criarErro('O nome é obrigatório e deve ter pelo menos 2 caracteres', 400);
  }
  return texto;
}

// Validação específica para nome completo de pessoa física.
function validarNomeCompleto(nomeCompleto) {
  const nomeValido = validarNome(nomeCompleto);
  if (!nomeValido.includes(' ')) {
    throw criarErro('Informe o nome completo com pelo menos um sobrenome', 400);
  }
  return nomeValido;
}

// Garante que a data fornecida é válida e não está no futuro.
function validarDataNascimento(dataNascimento) {
  if (!dataNascimento) {
    throw criarErro('Data de nascimento é obrigatória', 400);
  }

  const data = new Date(dataNascimento);
  if (Number.isNaN(data.getTime())) {
    throw criarErro('Data de nascimento inválida', 400);
  }

  const hoje = new Date();
  if (data > hoje) {
    throw criarErro('Data de nascimento não pode estar no futuro', 400);
  }

  return data.toISOString().split('T')[0];
}

// Normaliza campos de texto opcionais para evitar persistir strings vazias.
function normalizarOpcional(texto) {
  if (texto === undefined || texto === null) return null;
  const valor = String(texto).trim();
  return valor.length ? valor : null;
}

// Remove caracteres não numéricos e limita a 11 dígitos
function normalizarCpf(cpf) {
  return String(cpf || '')
    .replace(/\D/g, '')
    .slice(0, 11);
}

// Validação de CPF com os mesmos dígitos verificadores usados no frontend
function validarCpfOpcional(cpf) {
  const somenteNumeros = normalizarCpf(cpf);
  if (!somenteNumeros) return null;

  if (somenteNumeros.length !== 11 || /^(\d)\1{10}$/.test(somenteNumeros)) {
    throw criarErro('CPF inválido', 400);
  }

  // Calcula dígitos verificadores para conferir integridade
  const calcularDigito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) {
      soma += parseInt(base[i], 10) * (base.length + 1 - i);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = calcularDigito(somenteNumeros.slice(0, 9));
  const segundo = calcularDigito(somenteNumeros.slice(0, 10));

  if (primeiro !== parseInt(somenteNumeros[9], 10) || segundo !== parseInt(somenteNumeros[10], 10)) {
    throw criarErro('CPF inválido', 400);
  }

  return somenteNumeros;
}

// Converte lista de IDs (string ou array) em array sanitizado.
function normalizarListaIds(listaIds) {
  if (!listaIds) return [];
  let valores = listaIds;
  if (typeof listaIds === 'string') {
    try {
      valores = JSON.parse(listaIds);
    } catch (_) {
      valores = listaIds.split(',');
    }
  }

  if (!Array.isArray(valores)) {
    throw criarErro('A lista de fotos a remover deve ser um array de IDs', 400);
  }

  return valores
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
}

// Valida uploads de fotos garantindo tipo e tamanho adequados.
function validarFotosUpload(arquivos) {
  if (!arquivos || arquivos.length === 0) return [];

  return arquivos.map((file) => {
    if (!MIMES_PERMITIDOS.includes(file.mimetype)) {
      throw criarErro('Tipo de imagem não suportado. Use PNG, JPG ou WEBP.', 400);
    }
    if (file.size > TAMANHO_MAX_FOTO) {
      throw criarErro('Cada foto deve ter no máximo 5MB', 400);
    }

    return {
      nomeOriginal: file.originalname,
      mimeType: file.mimetype,
      tamanho: file.size,
      caminho: file.path.replace(/\\/g, '/').replace(BASE_UPLOAD_DIR.replace(/\\/g, '/'), '').replace(/^\//, ''),
    };
  });
}

function extrairArquivosCampo(arquivos, campo) {
  // Comentário: permite receber tanto arrays quanto objetos retornados pelo multer.fields
  if (!arquivos) return [];
  if (Array.isArray(arquivos)) {
    return arquivos.filter((arq) => arq?.fieldname === campo);
  }
  if (arquivos && typeof arquivos === 'object') {
    const lista = arquivos[campo];
    return Array.isArray(lista) ? lista : [];
  }
  return [];
}

function normalizarIndiceRede(valor) {
  // Comentário: garante que o índice de rede seja um número inteiro válido
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number.parseInt(valor, 10);
  return Number.isNaN(numero) ? null : numero;
}

function normalizarRedesImagens(lista) {
  // Comentário: valida estrutura enviada pelo frontend com metadados das redes e imagens existentes
  if (!lista) return [];
  if (!Array.isArray(lista)) {
    throw criarErro('O campo redesImagens deve ser um array', 400);
  }
  return lista.map((item) => {
    const redeSocialId = normalizarOpcional(item?.redeSocialId || item?.rede_social_id);
    const index = normalizarIndiceRede(item?.index ?? item?.redeIndex);
    const tipoRede = normalizarOpcional(item?.tipoRede || item?.tipo);
    const perfil = normalizarOpcional(item?.perfil || item?.url);
    const qr = item?.qrCode || item?.qrcode;
    const qrCode = qr
      ? {
          referencia: normalizarOpcional(qr?.referencia || qr?.id),
          nome: normalizarOpcional(qr?.nome || qr?.nomeArquivo),
        }
      : null;
    const perfis = Array.isArray(item?.perfilImagens || item?.perfis)
      ? (item.perfilImagens || item.perfis)
          .map((img) => ({
            referencia: normalizarOpcional(img?.referencia || img?.id),
            nome: normalizarOpcional(img?.nome || img?.nomeArquivo),
          }))
          .filter((img) => img.referencia || img.nome)
      : [];
    return {
      index,
      redeSocialId,
      tipoRede,
      perfil,
      qrCode,
      perfilImagens: perfis,
    };
  }).filter((item) => item.index !== null || item.redeSocialId || item.tipoRede || item.perfil || item.qrCode || item.perfilImagens.length);
}

function normalizarRemocoesRedesImagens(lista) {
  // Comentário: valida pedidos de remoção por rede
  if (!lista) return [];
  if (!Array.isArray(lista)) {
    throw criarErro('O campo redesImagensParaRemover deve ser um array', 400);
  }
  return lista.map((item) => ({
    index: normalizarIndiceRede(item?.index ?? item?.redeIndex),
    redeSocialId: normalizarOpcional(item?.redeSocialId || item?.rede_social_id),
    removerQrCode: Boolean(item?.removerQrCode),
    perfisParaRemover: Array.isArray(item?.perfisParaRemover)
      ? item.perfisParaRemover.map((id) => String(id || '').trim()).filter(Boolean)
      : [],
  })).filter((item) => item.removerQrCode || item.perfisParaRemover.length || item.index !== null || item.redeSocialId);
}

function mapearUploadsRedes(metaLista, arquivos) {
  // Comentário: associa índices enviados no payload aos arquivos recebidos via multer
  if (!Array.isArray(metaLista) || !metaLista.length) return [];
  return metaLista.map((meta) => {
    const redeIndex = normalizarIndiceRede(meta?.redeIndex ?? meta?.index);
    const arquivoIndex = normalizarIndiceRede(meta?.arquivoIndex);
    const arquivo = Number.isInteger(arquivoIndex) ? arquivos[arquivoIndex] : null;
    if (!arquivo) return null;
    return { redeIndex, arquivoIndex, arquivo };
  }).filter(Boolean);
}

// Validação de criação de pessoa com campos obrigatórios e opcionais.
function limparListaStrings(lista, transform = (v) => v) {
  if (!lista) return [];
  if (!Array.isArray(lista)) {
    throw criarErro('O campo deve ser uma lista', 400);
  }
  return lista
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter((v) => v.length > 0)
    .map(transform);
}

// Normaliza e valida uma lista de veículos para serem vinculados à pessoa
function validarListaVeiculos(lista, nomeTitular, cpfTitular) {
  if (lista === undefined || lista === null) return undefined;
  if (!Array.isArray(lista)) {
    throw criarErro('O campo veiculos deve ser uma lista', 400);
  }

  // Primeiro filtra itens que têm dados relevantes para evitar validar objetos vazios
  const itensComDados = lista.filter((v) => {
    if (!v || typeof v !== 'object') return false;
    const campos = [v.placa, v.nomeProprietario, v.marcaModelo, v.cor, v.anoModelo];
    return campos.some((c) => String(c ?? '').trim().length > 0);
  });

  return itensComDados
    .map((veiculo) => validarCadastroVeiculo({
      ...veiculo,
      nomeProprietario: veiculo?.nomeProprietario || nomeTitular,
      cpf: veiculo?.cpf || cpfTitular,
    }));
}

function validarCadastroPessoa(payload, arquivos = []) {
  const telefonesArray = limparListaStrings(payload.telefones || []);
  const emailsArray = limparListaStrings(payload.emails || [], normalizarEmail);
  const redesSociaisArray = limparListaStrings(payload.redesSociais || []);
  // Empresa removida do cadastro de Pessoas; não validar aqui
  const vinculosObj = validarVinculos(payload.vinculos);
  const docsOcorrencias = extrairArquivosCampo(arquivos, 'documentosOcorrenciasPoliciais');
  const imgsMonitoramento = extrairArquivosCampo(arquivos, 'imagensMonitoramento');
  const ocorrenciasObj = validarOcorrencias(payload.ocorrencias, docsOcorrencias, imgsMonitoramento);
  const fotosUpload = validarFotosUpload(extrairArquivosCampo(arquivos, 'fotos'));
  // Novos campos de imagens em Contatos: QR-CODE (único) e Perfil (múltiplas)
  const qrCodeUpload = validarFotosUpload(extrairArquivosCampo(arquivos, 'qrCode')).slice(0, 1);
  const imagensPerfilUpload = validarFotosUpload(extrairArquivosCampo(arquivos, 'imagensPerfil'));
  // Comentário: uploads de imagens por rede social (QR e Perfil) com meta de índice
  const redesQrCodeUpload = validarFotosUpload(extrairArquivosCampo(arquivos, 'redesQrCode'));
  const redesPerfilUpload = validarFotosUpload(extrairArquivosCampo(arquivos, 'redesPerfilImagens'));
  const redesImagensMeta = payload.redesImagensUploadMeta && typeof payload.redesImagensUploadMeta === 'object'
    ? payload.redesImagensUploadMeta
    : {};
  const redesQrCodeMeta = mapearUploadsRedes(redesImagensMeta.qrCodes, redesQrCodeUpload);
  const redesPerfilMeta = mapearUploadsRedes(redesImagensMeta.perfis, redesPerfilUpload);
  // Veículo associado ao cadastro de pessoa pode herdar dados do titular
  // Somente valida veículo se houver dados relevantes (ex.: placa ou proprietário)
  const veiculoTemDados = (() => {
    const v = payload.veiculo;
    if (!v || typeof v !== 'object') return false;
    const campos = [v.placa, v.nomeProprietario, v.marcaModelo, v.cor, v.anoModelo];
    return campos.some((c) => String(c ?? '').trim().length > 0);
  })();

  const veiculo = veiculoTemDados
    ? validarCadastroVeiculo({
        ...payload.veiculo,
        nomeProprietario: payload.veiculo.nomeProprietario || payload.nomeCompleto,
        cpf: payload.veiculo.cpf || payload.cpf,
      })
    : undefined;

  // Garante que o campo legado `telefone` também entre na lista normalizada de telefones
  const telefoneUnico = payload.telefone ? normalizarOpcional(payload.telefone) : null;
  const telefonesNormalizados = telefoneUnico
    ? [telefoneUnico, ...telefonesArray]
    : telefonesArray;
  const telefonesUnicos = telefonesNormalizados
    // Remove números repetidos, preservando a primeira ocorrência limpa
    .filter((tel, index, lista) => tel && lista.findIndex((item) => item.toLowerCase() === tel.toLowerCase()) === index);

  return {
    nomeCompleto: validarNomeCompleto(payload.nomeCompleto),
    apelido: normalizarOpcional(payload.apelido),
    dataNascimento: payload.dataNascimento ? validarDataNascimento(payload.dataNascimento) : '',
    // Persiste idade calculada no backend; aceita dado do frontend mas prioriza cálculo
    idade: (() => {
      const d = payload.dataNascimento ? validarDataNascimento(payload.dataNascimento) : '';
      if (!d) return null;
      const [y,m,dia] = d.split('-').map((n) => parseInt(n, 10));
      const hoje = new Date();
      let idade = hoje.getFullYear() - y;
      const aindaNaoFez = (hoje.getMonth() < (m-1)) || (hoje.getMonth() === (m-1) && hoje.getDate() < dia);
      if (aindaNaoFez) idade -= 1;
      return idade;
    })(),
    cpf: normalizarOpcional(payload.cpf),
    rg: normalizarOpcional(payload.rg),
    cnh: normalizarOpcional(payload.cnh),
    nomeMae: normalizarOpcional(payload.nomeMae),
    nomePai: normalizarOpcional(payload.nomePai),
    // Campo opcional para registrar sinais físicos ou marcas identificadoras
    sinais: normalizarOpcional(payload.sinais),
    // Associação opcional com facção/organização criminosa
    faccaoId: normalizarOpcional(payload.faccaoId || payload.faccao_id),
    faccaoNome: normalizarOpcional(payload.faccaoNome || payload.faccao),
    endereco_atual_index: payload.endereco_atual_index || 0,
    enderecos: validarEnderecos(payload.enderecos),
    telefones: telefonesUnicos,
    emails: emailsArray,
    redesSociais: redesSociaisArray,
    vinculos: vinculosObj,
    ocorrencias: ocorrenciasObj,
    fotos: fotosUpload,
    qrCode: qrCodeUpload[0] || undefined,
    imagensPerfil: imagensPerfilUpload,
    redesImagens: normalizarRedesImagens(payload.redesImagens),
    redesImagensParaRemover: normalizarRemocoesRedesImagens(payload.redesImagensParaRemover),
    redesImagensUploads: {
      qrCodes: redesQrCodeMeta,
      perfis: redesPerfilMeta,
    },
    veiculo,
    veiculos: validarListaVeiculos(payload.veiculos, payload.nomeCompleto, payload.cpf),
  };
}

// Valida array de endereços
function validarEnderecos(enderecos) {
  if (!enderecos) return [];

  let lista = enderecos;
  if (typeof enderecos === 'string') {
    try {
      lista = JSON.parse(enderecos);
    } catch (_) {
      return [];
    }
    if (!Array.isArray(lista)) {
      return [];
    }
  }

  if (!Array.isArray(lista)) {
    throw criarErro('Endereços deve ser um array', 400);
  }

  return lista.map(endereco => ({
    id: endereco.id || undefined,
    uf: normalizarOpcional(endereco.uf),
    logradouro: normalizarOpcional(endereco.logradouro),
    // Número é opcional, mas usado na geocodificação e exibição completa.
    numero: normalizarOpcional(endereco.numero),
    bairro: normalizarOpcional(endereco.bairro),
    // Cidade é opcional para compatibilidade, mas facilita a geocodificação.
    cidade: normalizarOpcional(endereco.cidade),
    // Complemento agora é validado e normalizado para ser persistido corretamente.
    complemento: normalizarOpcional(endereco.complemento),
    // Campo livre de observações
    obs: normalizarOpcional(endereco.obs),
    // Permite salvar latitude/longitude em formato livre (ex: "-23.5, -46.6")
    latLong: normalizarOpcional(endereco.latLong),
    cep: normalizarOpcional(endereco.cep),
  }));
}

function validarEmpresa(empresa) {
  if (!empresa || typeof empresa !== 'object') return undefined;
  const normalizarNum = (txt) => (txt == null ? '' : String(txt).replace(/\D/g, ''));
  const cnpjNums = normalizarNum(empresa.cnpj || '');
  const cpfSocio = (txt) => normalizarOpcional(normalizarNum(txt || ''));
  const data = empresa.dataInicioAtividade ? new Date(empresa.dataInicioAtividade) : null;
  const dataIso = data && !Number.isNaN(data.getTime()) ? data.toISOString().split('T')[0] : null;
  const situacao = empresa.situacaoCadastral && ['Ativo','Inativo','Inapta'].includes(String(empresa.situacaoCadastral))
    ? empresa.situacaoCadastral : null;

  const socios = Array.isArray(empresa.socios) ? empresa.socios.map(s => ({
    nome: normalizarOpcional(s.nome),
    cpf: cpfSocio(s.cpf),
  })).filter(s => s.nome || s.cpf) : [];

  const obj = {
    cnpj: cnpjNums ? cnpjNums : null,
    razaoSocial: normalizarOpcional(empresa.razaoSocial),
    nomeFantasia: normalizarOpcional(empresa.nomeFantasia),
    naturezaJuridica: normalizarOpcional(empresa.naturezaJuridica),
    dataInicioAtividade: dataIso || null,
    situacaoCadastral: situacao,
    cep: normalizarOpcional(normalizarNum(empresa.cep || '')),
    endereco: normalizarOpcional(empresa.endereco),
    telefone: normalizarOpcional(empresa.telefone),
    socios,
  };

  const temCampo = Object.values({ ...obj, socios: undefined }).some(v => v);
  if (!temCampo && socios.length === 0) return undefined;
  return obj;
}

function validarVinculos(vinculos) {
  if (!vinculos || typeof vinculos !== 'object') return undefined;
  const pessoas = Array.isArray(vinculos.pessoas) ? vinculos.pessoas.map(p => ({
    nome: normalizarOpcional(p.nome),
    cpf: normalizarOpcional((p.cpf || '').replace(/\D/g, '')),
    tipo: normalizarOpcional(p.tipo),
  })).filter(p => p.nome || p.cpf || p.tipo) : [];
  // Permite vínculos de empresas tanto por ID quanto por nome/observações
  const empresas = Array.isArray(vinculos.empresas) ? vinculos.empresas
    .map((e) => {
      const idBruto = (e && typeof e === 'object') ? (e.id ?? e.empresaId) : e;
      const idNormalizado = idBruto !== undefined && idBruto !== null && String(idBruto).trim() !== ''
        ? (Number.isNaN(Number(idBruto)) ? String(idBruto) : Number(idBruto))
        : undefined;
      const nome = normalizarOpcional(e?.nome);
      const observacoes = normalizarOpcional(e?.observacoes);
      const possuiDados = idNormalizado !== undefined || nome || observacoes;
      if (!possuiDados) return null;
      return { id: idNormalizado, nome, observacoes };
    })
    .filter(Boolean) : [];
  // Permite vínculos de entidades tanto por ID quanto por nome/observações, semelhante a empresas
  const entidades = Array.isArray(vinculos.entidades) ? vinculos.entidades
    .map((e) => {
      const idBruto = (e && typeof e === 'object') ? (e.id ?? e.entidadeId) : e;
      const idNormalizado = idBruto !== undefined && idBruto !== null && String(idBruto).trim() !== ''
        ? (Number.isNaN(Number(idBruto)) ? String(idBruto) : Number(idBruto))
        : undefined;
      const nome = normalizarOpcional(e?.nome);
      const observacoes = normalizarOpcional(e?.observacoes);
      const lider = normalizarOpcional(e?.lider);
      const possuiDados = idNormalizado !== undefined || nome || observacoes || lider;
      if (!possuiDados) return null;
      return { id: idNormalizado, nome, observacoes, lider };
    })
    .filter(Boolean) : [];
  const empregaticio = Array.isArray(vinculos.empregaticio) ? vinculos.empregaticio.map(e => ({
    info: normalizarOpcional(e.info),
  })).filter(e => e.info) : [];
  const veiculos = Array.isArray(vinculos.veiculos) ? vinculos.veiculos
    .map((veiculo) => {
      const placa = veiculo?.placa ? validarPlaca(veiculo.placa) : null;
      const marcaModelo = normalizarOpcional(veiculo?.marcaModelo);
      const cor = normalizarOpcional(veiculo?.cor);
      const anoEntrada = veiculo?.anoModelo !== undefined ? veiculo.anoModelo : veiculo?.ano;
      const anoModelo = validarAnoModelo(anoEntrada);
      const nome = normalizarOpcional(veiculo?.nome || veiculo?.nomeProprietario);
      const cpf = normalizarOpcional((veiculo?.cpf || '').replace(/\D/g, ''));
      const obs = normalizarOpcional(veiculo?.obs || veiculo?.observacoes);
      const possuiDados = placa || marcaModelo || cor || (anoModelo !== null) || obs || nome || cpf;
      if (!possuiDados) return null;
      return { placa, marcaModelo, cor, anoModelo, obs, nome, cpf };
    })
    .filter(Boolean)
    : [];
  const temAlgum = pessoas.length || empresas.length || entidades.length || empregaticio.length || veiculos.length;
  if (!temAlgum) return undefined;
  return { pessoas, empresas, entidades, empregaticio, veiculos };
}

function validarOcorrencias(ocorrencias, documentosOcorrencias = [], imagensMonitoramento = []) {
  if (!ocorrencias || typeof ocorrencias !== 'object') return undefined;
  const normalizarItens = (lista, docs = []) => Array.isArray(lista) ? lista.map((i, idx) => {
    const data = normalizarOpcional(i.data);
    const info = normalizarOpcional(i.info);
    const caminhoDoc = normalizarOpcional(i.documento);
    const nomeDoc = normalizarOpcional(i.documentoNome);
    const indiceUpload = Number.isInteger(i?.documentoUploadIndex)
      ? i.documentoUploadIndex
      : (i?.documentoUploadIndex !== undefined ? parseInt(i.documentoUploadIndex, 10) : null);
    const arquivo = docs[idx] || (Number.isInteger(indiceUpload) ? docs[indiceUpload] : null);

    // Monta representação do documento priorizando uploads novos
    const documento = (() => {
      if (arquivo) {
        return {
          caminho: `/uploads/ocorrencias/${arquivo.filename}`,
          nome: arquivo.originalname,
          mimeType: arquivo.mimetype,
          tamanho: arquivo.size,
        };
      }
      if (caminhoDoc) {
        return {
          caminho: caminhoDoc,
          nome: nomeDoc || caminhoDoc,
        };
      }
      return null;
    })();

    const temDados = data || info || documento;
    if (!temDados) return null;
    const item = { data, info };
    if (documento) item.documento = documento;
    return item;
  }).filter(Boolean) : [];

  const policiais = normalizarItens(ocorrencias.policiais, documentosOcorrencias);
  const processos = normalizarItens(ocorrencias.processos);
  const abordagens = normalizarItens(ocorrencias.abordagens);
  const prisoes = normalizarItens(ocorrencias.prisoes);
  // Monitoramentos: múltiplas imagens por evento via índices de upload + referências existentes
  const monitoramentos = Array.isArray(ocorrencias.monitoramentos) ? ocorrencias.monitoramentos.map((m, idx) => {
    const data = normalizarOpcional(m.data);
    const evento = normalizarOpcional(m.evento);
    const descricao = normalizarOpcional(m.descricao);
    const indices = Array.isArray(m.imagensUploadIndices) ? m.imagensUploadIndices : [];
    let imagens = indices
      .map((ix) => (Number.isInteger(ix) ? imagensMonitoramento[ix] : null))
      .filter(Boolean)
      .map((arquivo) => ({
        caminho: `/uploads/ocorrencias/${arquivo.filename}`,
        nome: arquivo.originalname,
        mimeType: arquivo.mimetype,
        tamanho: arquivo.size,
      }));
    // Imagens existentes enviadas no payload devem ser preservadas
    const existentesPayload = Array.isArray(m.imagens) ? m.imagens
      .map((img) => {
        const caminho = normalizarOpcional(img?.caminho || img);
        const nome = normalizarOpcional(img?.nome);
        if (!caminho) return null;
        const cam = caminho.startsWith('/uploads/ocorrencias/')
          ? caminho
          : (caminho.startsWith('uploads/ocorrencias/') ? `/${caminho}` : null);
        if (!cam) return null;
        return { caminho: cam, nome: nome || null };
      })
      .filter(Boolean) : [];
    const todos = [...existentesPayload, ...imagens];
    const vistos = new Set();
    imagens = todos.filter((img) => {
      const key = img.caminho;
      if (!key) return false;
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    });
    // Fallback: se nenhum índice foi enviado, usa posição do item
    if (!imagens.length && imagensMonitoramento[idx]) {
      const arquivo = imagensMonitoramento[idx];
      imagens = [{
        caminho: `/uploads/ocorrencias/${arquivo.filename}`,
        nome: arquivo.originalname,
        mimeType: arquivo.mimetype,
        tamanho: arquivo.size,
      }];
    }

    const temDados = data || evento || descricao || (imagens.length > 0);
    if (!temDados) return null;
    const item = { data, evento, descricao };
    if (imagens.length) item.imagens = imagens;
    return item;
  }).filter(Boolean) : [];

  const temAlgum = policiais.length || processos.length || abordagens.length || prisoes.length || monitoramentos.length;
  if (!temAlgum) return undefined;
  return { policiais, processos, abordagens, prisoes, monitoramentos };
}

// Validação de atualização de pessoa garantindo ao menos um campo.
function validarAtualizacaoPessoa(payload, arquivos = []) {
  const atualizacoes = {};

  if (payload.nomeCompleto !== undefined) {
    atualizacoes.nomeCompleto = validarNomeCompleto(payload.nomeCompleto);
  }
  if (payload.dataNascimento !== undefined) {
    atualizacoes.dataNascimento = payload.dataNascimento ? validarDataNascimento(payload.dataNascimento) : '';
    // Atualiza idade se dataNascimento foi enviada
    if (atualizacoes.dataNascimento) {
      const [y,m,dia] = atualizacoes.dataNascimento.split('-').map((n) => parseInt(n, 10));
      const hoje = new Date();
      let idade = hoje.getFullYear() - y;
      const aindaNaoFez = (hoje.getMonth() < (m-1)) || (hoje.getMonth() === (m-1) && hoje.getDate() < dia);
      if (aindaNaoFez) idade -= 1;
      atualizacoes.idade = idade;
    } else {
      atualizacoes.idade = null;
    }
  }
  // Permite atualizar idade diretamente se enviada
  if (payload.idade !== undefined && atualizacoes.idade === undefined) {
    const n = parseInt(payload.idade, 10);
    atualizacoes.idade = Number.isNaN(n) ? null : n;
  }

  const camposOpcionais = [
    'cpf',
    'rg',
    'cnh',
    'nomeMae',
    'nomePai',
    'sinais',
    'apelido',
  ];

  camposOpcionais.forEach((campo) => {
    if (payload[campo] !== undefined) {
      atualizacoes[campo] = normalizarOpcional(payload[campo]);
    }
  });

  if (payload.faccaoId !== undefined || payload.faccao_id !== undefined) {
    atualizacoes.faccao_id = normalizarOpcional(payload.faccaoId || payload.faccao_id);
  }
  if (payload.faccaoNome !== undefined || payload.faccao !== undefined) {
    atualizacoes.faccaoNome = normalizarOpcional(payload.faccaoNome || payload.faccao);
  }

  // Validar endereços se fornecidos
  if (payload.enderecos !== undefined) {
    atualizacoes.enderecos = validarEnderecos(payload.enderecos);
  }

  // Validar listas se fornecidas (telefones, emails, redes)
  const telefonesAtualizados = payload.telefones !== undefined
    ? limparListaStrings(payload.telefones || [])
    : undefined;
  const telefoneLegado = payload.telefone ? normalizarOpcional(payload.telefone) : null;
  if (telefonesAtualizados !== undefined || telefoneLegado) {
    const listaComLegado = telefoneLegado
      ? [telefoneLegado, ...(telefonesAtualizados || [])]
      : telefonesAtualizados || [];
    atualizacoes.telefones = listaComLegado
      // Evita persistir números repetidos ao atualizar
      .filter((tel, index, lista) => tel && lista.findIndex((item) => item.toLowerCase() === tel.toLowerCase()) === index);
  }
  if (payload.emails !== undefined) {
    atualizacoes.emails = limparListaStrings(payload.emails || [], normalizarEmail);
  }
  if (payload.redesSociais !== undefined) {
    atualizacoes.redesSociais = limparListaStrings(payload.redesSociais || []);
  }
  // Validar fotos novas e remoções solicitadas
  atualizacoes.fotos = validarFotosUpload(extrairArquivosCampo(arquivos, 'fotos'));
  atualizacoes.fotosParaRemover = normalizarListaIds(payload.fotosParaRemover);
  // Validar novas imagens de redes sociais
  const qrCodeUpload = validarFotosUpload(extrairArquivosCampo(arquivos, 'qrCode')).slice(0, 1);
  const imagensPerfilUpload = validarFotosUpload(extrairArquivosCampo(arquivos, 'imagensPerfil'));
  atualizacoes.qrCode = qrCodeUpload[0] || undefined;
  atualizacoes.imagensPerfil = imagensPerfilUpload;
  // Comentário: processa uploads e metadados das imagens por rede
  const redesQrCodeUpload = validarFotosUpload(extrairArquivosCampo(arquivos, 'redesQrCode'));
  const redesPerfilUpload = validarFotosUpload(extrairArquivosCampo(arquivos, 'redesPerfilImagens'));
  const redesImagensMeta = payload.redesImagensUploadMeta && typeof payload.redesImagensUploadMeta === 'object'
    ? payload.redesImagensUploadMeta
    : {};
  const redesQrCodeMeta = mapearUploadsRedes(redesImagensMeta.qrCodes, redesQrCodeUpload);
  const redesPerfilMeta = mapearUploadsRedes(redesImagensMeta.perfis, redesPerfilUpload);
  // Remoções
  atualizacoes.redesPerfisParaRemover = normalizarListaIds(payload.redesPerfisParaRemover);
  if (payload.removerQrCode !== undefined) {
    const val = String(payload.removerQrCode).toLowerCase();
    atualizacoes.removerQrCode = (val === 'true' || val === '1');
  }
  atualizacoes.redesImagens = normalizarRedesImagens(payload.redesImagens);
  atualizacoes.redesImagensParaRemover = normalizarRemocoesRedesImagens(payload.redesImagensParaRemover);
  atualizacoes.redesImagensUploads = {
    qrCodes: redesQrCodeMeta,
    perfis: redesPerfilMeta,
  };
  // Empresa removida do cadastro de Pessoas; ignorar atualizações
  if (payload.vinculos !== undefined) {
    atualizacoes.vinculos = validarVinculos(payload.vinculos);
  }
  if (payload.ocorrencias !== undefined) {
    const docsOcorrencias = extrairArquivosCampo(arquivos, 'documentosOcorrenciasPoliciais');
    const imgsMonitoramento = extrairArquivosCampo(arquivos, 'imagensMonitoramento');
    atualizacoes.ocorrencias = validarOcorrencias(payload.ocorrencias, docsOcorrencias, imgsMonitoramento);
  }

  // Veículo na atualização será validado posteriormente com dados completos do titular
  if (payload.veiculo !== undefined) {
    atualizacoes.veiculo = payload.veiculo;
  }

  // Lista de veículos informada explicitamente
  if (payload.veiculos !== undefined) {
    atualizacoes.veiculos = validarListaVeiculos(payload.veiculos, payload.nomeCompleto, payload.cpf);
  }

  // Validar índice do endereço atual
  if (payload.endereco_atual_index !== undefined) {
    atualizacoes.endereco_atual_index = payload.endereco_atual_index;
  }

  if (Object.keys(atualizacoes).length === 0) {
    throw criarErro('Nenhum dado para atualizar foi enviado', 400);
  }

  return atualizacoes;
}

function validarCadastro(payload) {
  return {
    nome: validarNome(payload.nome),
    email: validarEmail(payload.email),
    senha: validarSenha(payload.senha),
    role: payload.role || 'user',
  };
}

function validarLogin(payload) {
  return {
    email: validarEmail(payload.email),
    senha: validarSenha(payload.senha),
  };
}

function validarAtualizacao(payload) {
  const atualizacoes = {};

  if (payload.nome !== undefined) {
    atualizacoes.nome = validarNome(payload.nome);
  }
  if (payload.email !== undefined) {
    atualizacoes.email = validarEmail(payload.email);
  }
  if (payload.senha !== undefined) {
    atualizacoes.senha = validarSenha(payload.senha);
  }
  if (payload.role !== undefined) {
    atualizacoes.role = payload.role;
  }

  if (Object.keys(atualizacoes).length === 0) {
    throw criarErro('Nenhum dado para atualizar foi enviado', 400);
  }

  return atualizacoes;
}

// Validação específica para placas seguindo padrão Mercosul e antigo
function validarPlaca(placa) {
  const valorLimpo = String(placa || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);

  const padrao = /^(?=.{7}$)[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
  if (!valorLimpo || !padrao.test(valorLimpo)) {
    throw criarErro('Placa inválida. Use o padrão Mercosul ou antigo.', 400);
  }

  return valorLimpo;
}

// Valida ano/modelo opcional com faixa segura
function validarAnoModelo(anoModelo) {
  if (anoModelo === undefined || anoModelo === null || anoModelo === '') return null;
  const numero = parseInt(String(anoModelo).replace(/\D/g, ''), 10);
  if (Number.isNaN(numero) || numero < 1900 || numero > 2100) {
    throw criarErro('Ano/modelo inválido. Informe um ano entre 1900 e 2100.', 400);
  }
  return numero;
}

// Cadastro de veículo exige proprietário e placa
function validarCadastroVeiculo(payload) {
  return {
    nomeProprietario: validarNome(payload.nomeProprietario || payload.nome || ''),
    cpf: validarCpfOpcional(payload.cpf),
    placa: validarPlaca(payload.placa),
    marcaModelo: normalizarOpcional(payload.marcaModelo),
    cor: normalizarOpcional(payload.cor),
    anoModelo: validarAnoModelo(payload.anoModelo),
    // Comentário: campo opcional de observações do veículo
    obs: normalizarOpcional(payload.obs),
  };
}

// Atualização permite campos parciais, mantendo validações
function validarAtualizacaoVeiculo(payload) {
  const atualizacoes = {};

  if (payload.nomeProprietario !== undefined) {
    atualizacoes.nomeProprietario = validarNome(payload.nomeProprietario);
  }
  if (payload.cpf !== undefined) {
    atualizacoes.cpf = validarCpfOpcional(payload.cpf);
  }
  if (payload.placa !== undefined) {
    atualizacoes.placa = validarPlaca(payload.placa);
  }
  if (payload.marcaModelo !== undefined) {
    atualizacoes.marcaModelo = normalizarOpcional(payload.marcaModelo);
  }
  if (payload.cor !== undefined) {
    atualizacoes.cor = normalizarOpcional(payload.cor);
  }
  if (payload.anoModelo !== undefined) {
    atualizacoes.anoModelo = validarAnoModelo(payload.anoModelo);
  }
  if (payload.obs !== undefined) {
    // Comentário: normaliza observações para evitar strings vazias
    atualizacoes.obs = normalizarOpcional(payload.obs);
  }

  if (Object.keys(atualizacoes).length === 0) {
    throw criarErro('Nenhum dado para atualizar foi enviado', 400);
  }

  return atualizacoes;
}

module.exports = {
  validarFotosUpload,
  extrairArquivosCampo,
  validarCadastro,
  validarLogin,
  validarAtualizacao,
  validarCadastroPessoa,
  validarAtualizacaoPessoa,
  validarEnderecos,
  validarEmpresa,
  validarVinculos,
  validarOcorrencias,
  validarCadastroVeiculo,
  validarAtualizacaoVeiculo,
  validarCpfOpcional,
  validarPlaca,
};
