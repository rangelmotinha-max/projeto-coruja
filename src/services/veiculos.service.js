const VeiculoModel = require('../models/veiculos.model');
const VeiculoPessoaModel = require('../models/veiculos-pessoas.model');
const { criarErro } = require('../utils/helpers');
const { validarCadastroVeiculo, validarAtualizacaoVeiculo, validarPlaca, validarCpfOpcional } = require('../utils/validators');

// Normaliza strings opcionais removendo espaços e retornando null quando vazio
function normalizarTextoOpcional(texto) {
  const valor = String(texto ?? '').trim();
  return valor.length ? valor : null;
}

// Une resultados duplicados por placa ou CPF para evitar repetição ao responder a API
function mesclarResultados(lista) {
  const mapa = new Map();
  const resultados = [];

  lista.forEach((item) => {
    const chaves = [];
    if (item.placa) chaves.push(`placa:${item.placa}`);
    if (item.cpf) chaves.push(`cpf:${item.cpf}`);
    if (chaves.length === 0) {
      chaves.push(`nome:${item.nomeProprietario || ''}-modelo:${item.marcaModelo || ''}`);
    }

    let existente = null;
    for (const chave of chaves) {
      if (mapa.has(chave)) {
        existente = mapa.get(chave);
        break;
      }
    }

    const alvo = existente || { ...item };
    if (!existente) resultados.push(alvo);

    Object.assign(alvo, item);
    chaves.forEach((chave) => mapa.set(chave, alvo));
  });

  return resultados;
}

// Garante saída consistente com placa em maiúsculas e CPF apenas com dígitos
function normalizarRetornoVeiculo(veiculo) {
  return {
    placa: veiculo?.placa ? String(veiculo.placa).toUpperCase() : null,
    marcaModelo: veiculo?.marcaModelo || null,
    cor: veiculo?.cor || null,
    anoModelo: veiculo?.anoModelo ?? null,
    nomeProprietario: veiculo?.nomeProprietario || null,
    cpf: veiculo?.cpf ? String(veiculo.cpf).replace(/\D/g, '') : null,
  };
}

// Serviços de veículos centralizam validações antes da persistência
async function criar(payload) {
  const dadosBasicos = validarCadastroVeiculo(payload || {});
  const enderecos = Array.isArray(payload.enderecos) ? payload.enderecos : [];
  return VeiculoModel.create({ ...dadosBasicos, enderecos });
}

async function listar() {
  return VeiculoModel.findAll();
}

// Consulta combinada entre tabela de veículos e vínculos de pessoas
async function buscar(filtros = {}) {
  const placa = filtros.placa ? validarPlaca(filtros.placa) : null;
  const cpf = filtros.cpf !== undefined ? validarCpfOpcional(filtros.cpf) : null;
  const nomeProprietario = normalizarTextoOpcional(filtros.nomeProprietario);
  const marcaModelo = normalizarTextoOpcional(filtros.marcaModelo);

  const criterios = { placa, cpf, nomeProprietario, marcaModelo };

  const [veiculosLivres, veiculosPessoas] = await Promise.all([
    VeiculoModel.search(criterios),
    VeiculoPessoaModel.search(criterios),
  ]);

  const combinados = [...veiculosLivres, ...veiculosPessoas]
    .map((item) => normalizarRetornoVeiculo(item));

  return mesclarResultados(combinados);
}

async function buscarPorId(id) {
  const veiculo = await VeiculoModel.findById(id);
  if (!veiculo) throw criarErro('Veículo não encontrado', 404);
  return veiculo;
}

// Busca veículo diretamente pela placa para permitir vínculos rápidos
async function buscarPorPlaca(placa) {
  const placaValidada = validarPlaca(placa);
  const veiculo = await VeiculoModel.findByPlaca(placaValidada);
  if (!veiculo) throw criarErro('Veículo não encontrado', 404);
  return veiculo;
}

async function atualizar(id, payload) {
  await buscarPorId(id);
  const dadosAtualizacao = validarAtualizacaoVeiculo(payload || {});
  const enderecos = Array.isArray(payload.enderecos) ? payload.enderecos : undefined;
  const atualizado = await VeiculoModel.update(id, { ...dadosAtualizacao, enderecos });
  if (!atualizado) throw criarErro('Veículo não encontrado', 404);
  return atualizado;
}

async function remover(id) {
  await buscarPorId(id);
  await VeiculoModel.delete(id);
  return true;
}

module.exports = {
  criar,
  listar,
  buscar,
  buscarPorId,
  buscarPorPlaca,
  atualizar,
  remover,
};
