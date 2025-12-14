const VeiculoModel = require('../models/veiculos.model');
const { criarErro } = require('../utils/helpers');
const { validarCadastroVeiculo, validarAtualizacaoVeiculo, validarPlaca } = require('../utils/validators');

// Serviços de veículos centralizam validações antes da persistência
async function criar(payload) {
  const dados = validarCadastroVeiculo(payload || {});
  return VeiculoModel.create(dados);
}

async function listar() {
  return VeiculoModel.findAll();
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
  const dados = validarAtualizacaoVeiculo(payload || {});
  const atualizado = await VeiculoModel.update(id, dados);
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
  buscarPorId,
  buscarPorPlaca,
  atualizar,
  remover,
};
