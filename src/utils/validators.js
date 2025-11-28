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
function validarCadastroPessoa(payload) {
  return {
    nomeCompleto: validarNomeCompleto(payload.nomeCompleto),
    dataNascimento: validarDataNascimento(payload.dataNascimento),
    cpf: normalizarOpcional(payload.cpf),
    rg: normalizarOpcional(payload.rg),
    cnh: normalizarOpcional(payload.cnh),
    nomeMae: normalizarOpcional(payload.nomeMae),
    nomePai: normalizarOpcional(payload.nomePai),
    telefone: normalizarOpcional(payload.telefone),
    ultimoUf: normalizarOpcional(payload.ultimoUf),
    ultimoLogradouro: normalizarOpcional(payload.ultimoLogradouro),
    ultimoBairroCidade: normalizarOpcional(payload.ultimoBairroCidade),
    ultimoCep: normalizarOpcional(payload.ultimoCep),
    enderecoUf: normalizarOpcional(payload.enderecoUf),
    enderecoLogradouro: normalizarOpcional(payload.enderecoLogradouro),
    enderecoBairroCidade: normalizarOpcional(payload.enderecoBairroCidade),
    enderecoCep: normalizarOpcional(payload.enderecoCep),
  };
}

// Validação de atualização de pessoa garantindo ao menos um campo.
function validarAtualizacaoPessoa(payload) {
  const atualizacoes = {};

  if (payload.nomeCompleto !== undefined) {
    atualizacoes.nomeCompleto = validarNomeCompleto(payload.nomeCompleto);
  }
  if (payload.dataNascimento !== undefined) {
    atualizacoes.dataNascimento = validarDataNascimento(payload.dataNascimento);
  }

  const camposOpcionais = [
    'cpf',
    'rg',
    'cnh',
    'nomeMae',
    'nomePai',
    'telefone',
    'ultimoUf',
    'ultimoLogradouro',
    'ultimoBairroCidade',
    'ultimoCep',
    'enderecoUf',
    'enderecoLogradouro',
    'enderecoBairroCidade',
    'enderecoCep',
  ];

  camposOpcionais.forEach((campo) => {
    if (payload[campo] !== undefined) {
      atualizacoes[campo] = normalizarOpcional(payload[campo]);
    }
  });

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
};
