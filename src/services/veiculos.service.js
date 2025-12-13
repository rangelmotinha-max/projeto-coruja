const path = require('path');
const VeiculoModel = require('../models/veiculos.model');
const { criarErro } = require('../utils/helpers');
const { validarCpfObrigatorio } = require('../utils/validators');

// Normaliza texto deixando vazio como nulo para evitar lixo na base.
function limparTexto(valor) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto.length ? texto : null;
}

// Validação e saneamento dos campos antes de persistir.
function validarCampos(payload, arquivos = []) {
  const dados = { ...payload };

  const proprietario = limparTexto(dados.proprietario);
  if (!proprietario || proprietario.length < 3) {
    throw criarErro('Proprietário é obrigatório e deve conter pelo menos 3 caracteres.', 400);
  }

  const cpf = validarCpfObrigatorio(dados.cpf);

  const placa = limparTexto(dados.placa);
  const placaNormalizada = placa ? placa.toUpperCase() : null;

  const anoModelo = limparTexto(dados.anoModelo);
  if (anoModelo && !/^\d{4}$/.test(anoModelo)) {
    throw criarErro('Ano/Modelo deve conter 4 dígitos.', 400);
  }

  // Aceita apenas a primeira foto enviada para evitar sobrecarga no banco.
  const foto = Array.isArray(arquivos) && arquivos.length > 0 ? arquivos[0] : null;
  if (foto && foto.size > 5 * 1024 * 1024) {
    throw criarErro('A foto deve ter no máximo 5MB.', 400);
  }
  if (foto && !['image/jpeg', 'image/png', 'image/webp'].includes(foto.mimetype)) {
    throw criarErro('Tipo de imagem não suportado. Use PNG, JPG ou WEBP.', 400);
  }

  return {
    proprietario,
    cpf,
    marcaModelo: limparTexto(dados.marcaModelo),
    placa: placaNormalizada,
    cor: limparTexto(dados.cor),
    anoModelo,
    foto: foto
      ? {
          nomeOriginal: foto.originalname,
          mimeType: foto.mimetype,
          tamanho: foto.size,
          caminho: ['uploads', 'veiculos', path.basename(foto.path || '')].join('/'),
        }
      : null,
  };
}

// Cadastro de um novo veículo com validações mínimas.
async function criar(payload, arquivos) {
  const dados = validarCampos(payload || {}, arquivos || []);
  return VeiculoModel.create(dados);
}

// Lista completa para preencher grid na tela.
async function listar() {
  return VeiculoModel.findAll();
}

// Recupera um veículo específico, lançando erro quando ausente.
async function buscarPorId(id) {
  const veiculo = await VeiculoModel.findById(id);
  if (!veiculo) throw criarErro('Veículo não encontrado.', 404);
  return veiculo;
}

module.exports = { criar, listar, buscarPorId };
