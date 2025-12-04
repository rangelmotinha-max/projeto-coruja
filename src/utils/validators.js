const { normalizarEmail, criarErro } = require('./helpers');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function validarCadastroPessoa(payload) {
  const telefonesArray = limparListaStrings(payload.telefones || []);
  const emailsArray = limparListaStrings(payload.emails || [], normalizarEmail);
  const redesSociaisArray = limparListaStrings(payload.redesSociais || []);
  const veiculosArray = validarVeiculos(payload.veiculos || []);

  const primeiroTelefone = payload.telefone ? normalizarOpcional(payload.telefone) : (telefonesArray[0] || null);

  return {
    nomeCompleto: validarNomeCompleto(payload.nomeCompleto),
    apelido: normalizarOpcional(payload.apelido),
    dataNascimento: payload.dataNascimento ? validarDataNascimento(payload.dataNascimento) : '',
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
    veiculos: veiculosArray,
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
    cep: normalizarOpcional(endereco.cep),
  }));
}

// Valida array de veículos
function validarVeiculos(veiculos) {
  if (!veiculos) return [];
  if (!Array.isArray(veiculos)) {
    throw criarErro('Veículos deve ser um array', 400);
  }
  return veiculos.map(v => ({
    marcaModelo: normalizarOpcional(v.marcaModelo),
    placa: normalizarOpcional(v.placa ? String(v.placa).toUpperCase() : v.placa),
    cor: normalizarOpcional(v.cor),
    anoModelo: normalizarOpcional(v.anoModelo ? String(v.anoModelo).replace(/\D/g, '').slice(0,4) : v.anoModelo),
  }));
}

// Validação de atualização de pessoa garantindo ao menos um campo.
function validarAtualizacaoPessoa(payload) {
  const atualizacoes = {};

  if (payload.nomeCompleto !== undefined) {
    atualizacoes.nomeCompleto = validarNomeCompleto(payload.nomeCompleto);
  }
  if (payload.dataNascimento !== undefined) {
    atualizacoes.dataNascimento = payload.dataNascimento ? validarDataNascimento(payload.dataNascimento) : '';
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
  if (payload.veiculos !== undefined) {
    atualizacoes.veiculos = validarVeiculos(payload.veiculos || []);
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
  validarVeiculos,
};
