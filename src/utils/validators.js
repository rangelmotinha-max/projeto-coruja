const path = require('path');
const { normalizarEmail, criarErro } = require('./helpers');

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
  if (!nome || nome.trim().length < 2) {
    throw criarErro('O nome é obrigatório e deve ter pelo menos 2 caracteres', 400);
  }
  return nome.trim();
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

    const caminhoRelativo = path.relative(BASE_UPLOAD_DIR, file.path).replace(/\\/g, '/');
    if (caminhoRelativo.startsWith('..')) {
      throw criarErro('Falha ao salvar foto: caminho inválido', 400);
    }

    return {
      nomeOriginal: file.originalname,
      mimeType: file.mimetype,
      tamanho: file.size,
      caminho: caminhoRelativo,
    };
  });
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

function validarCadastroPessoa(payload, arquivos = []) {
  const telefonesArray = limparListaStrings(payload.telefones || []);
  const emailsArray = limparListaStrings(payload.emails || [], normalizarEmail);
  const redesSociaisArray = limparListaStrings(payload.redesSociais || []);
  // Empresa removida do cadastro de Pessoas; não validar aqui
  const vinculosObj = validarVinculos(payload.vinculos);
  const ocorrenciasObj = validarOcorrencias(payload.ocorrencias);
  const fotosUpload = validarFotosUpload(arquivos);

  const primeiroTelefone = payload.telefone ? normalizarOpcional(payload.telefone) : (telefonesArray[0] || null);

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
    telefone: primeiroTelefone,
    endereco_atual_index: payload.endereco_atual_index || 0,
    enderecos: validarEnderecos(payload.enderecos),
    telefones: telefonesArray,
    emails: emailsArray,
    redesSociais: redesSociaisArray,
    vinculos: vinculosObj,
    ocorrencias: ocorrenciasObj,
    fotos: fotosUpload,
  };
}

// Valida array de endereços
function validarEnderecos(enderecos) {
  if (!enderecos) return [];
  
  if (!Array.isArray(enderecos)) {
    throw criarErro('Endereços deve ser um array', 400);
  }

  return enderecos.map(endereco => ({
    id: endereco.id || undefined,
    uf: normalizarOpcional(endereco.uf),
    logradouro: normalizarOpcional(endereco.logradouro),
    bairro: normalizarOpcional(endereco.bairro),
    // Complemento agora é validado e normalizado para ser persistido corretamente.
    complemento: normalizarOpcional(endereco.complemento),
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
  const entidades = Array.isArray(vinculos.entidades) ? vinculos.entidades.map(e => ({
    nome: normalizarOpcional(e.nome),
    observacoes: normalizarOpcional(e.observacoes),
  })).filter(e => e.nome || e.observacoes) : [];
  const empregaticio = Array.isArray(vinculos.empregaticio) ? vinculos.empregaticio.map(e => ({
    info: normalizarOpcional(e.info),
  })).filter(e => e.info) : [];
  const temAlgum = pessoas.length || empresas.length || entidades.length || empregaticio.length;
  if (!temAlgum) return undefined;
  return { pessoas, empresas, entidades, empregaticio };
}

function validarOcorrencias(ocorrencias) {
  if (!ocorrencias || typeof ocorrencias !== 'object') return undefined;
  const normalizarItens = (lista) => Array.isArray(lista) ? lista.map(i => ({
    data: normalizarOpcional(i.data),
    info: normalizarOpcional(i.info),
  })).filter(i => i.data || i.info) : [];
  const policiais = normalizarItens(ocorrencias.policiais);
  const processos = normalizarItens(ocorrencias.processos);
  const abordagens = normalizarItens(ocorrencias.abordagens);
  const prisoes = normalizarItens(ocorrencias.prisoes);
  const temAlgum = policiais.length || processos.length || abordagens.length || prisoes.length;
  if (!temAlgum) return undefined;
  return { policiais, processos, abordagens, prisoes };
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
    'telefone',
    'apelido',
  ];

  camposOpcionais.forEach((campo) => {
    if (payload[campo] !== undefined) {
      atualizacoes[campo] = normalizarOpcional(payload[campo]);
    }
  });

  // Validar endereços se fornecidos
  if (payload.enderecos !== undefined) {
    atualizacoes.enderecos = validarEnderecos(payload.enderecos);
  }

  // Validar listas se fornecidas (telefones, emails, redes)
  if (payload.telefones !== undefined) {
    atualizacoes.telefones = limparListaStrings(payload.telefones || []);
  }
  if (payload.emails !== undefined) {
    atualizacoes.emails = limparListaStrings(payload.emails || [], normalizarEmail);
  }
  if (payload.redesSociais !== undefined) {
    atualizacoes.redesSociais = limparListaStrings(payload.redesSociais || []);
  }
  // Validar fotos novas e remoções solicitadas
  atualizacoes.fotos = validarFotosUpload(arquivos);
  atualizacoes.fotosParaRemover = normalizarListaIds(payload.fotosParaRemover);
  // Empresa removida do cadastro de Pessoas; ignorar atualizações
  if (payload.vinculos !== undefined) {
    atualizacoes.vinculos = validarVinculos(payload.vinculos);
  }
  if (payload.ocorrencias !== undefined) {
    atualizacoes.ocorrencias = validarOcorrencias(payload.ocorrencias);
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

module.exports = {
  validarCadastro,
  validarLogin,
  validarAtualizacao,
  validarCadastroPessoa,
  validarAtualizacaoPessoa,
  validarEnderecos,
  validarEmpresa,
  validarVinculos,
  validarOcorrencias,
};
