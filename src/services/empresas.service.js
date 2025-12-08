const EmpresaModel = require('../models/empresas.model');
const { criarErro } = require('../utils/helpers');

function sanitizeEmpresa(payload) {
  const cnpjDigits = String(payload.cnpj || '').replace(/\D/g, '');
  const cepDigits = String(payload.cep || '').replace(/\D/g, '');
  const telefone = String(payload.telefone || '').trim();
  const socios = Array.isArray(payload.socios)
    ? payload.socios.map((s) => ({
        nome: String(s?.nome || '').trim(),
        cpf: String(s?.cpf || '').replace(/\D/g, ''),
      })).filter((s) => s.nome || s.cpf)
    : [];

  return {
    cnpj: cnpjDigits || null,
    razaoSocial: payload.razaoSocial ? String(payload.razaoSocial).trim() : null,
    nomeFantasia: payload.nomeFantasia ? String(payload.nomeFantasia).trim() : null,
    naturezaJuridica: payload.naturezaJuridica ? String(payload.naturezaJuridica).trim() : null,
    dataInicioAtividade: payload.dataInicioAtividade || null,
    situacaoCadastral: payload.situacaoCadastral || null,
    endereco: payload.endereco ? String(payload.endereco).trim() : null,
    cep: cepDigits || null,
    telefone: telefone || null,
    socios,
  };
}

async function criar(payload) {
  const dados = sanitizeEmpresa(payload || {});
  // Regras mínimas: aceitar cadastro mesmo sem CNPJ; opcionalmente exigir razaoSocial
  // if (!dados.razaoSocial) throw criarErro('Razão Social é obrigatória.', 400);
  return EmpresaModel.create(dados);
}

async function listar() {
  return EmpresaModel.findAll();
}

async function buscarPorId(id) {
  const emp = await EmpresaModel.findById(id);
  if (!emp) throw criarErro('Empresa não encontrada', 404);
  return emp;
}

async function atualizar(id, payload) {
  const existente = await EmpresaModel.findById(id);
  if (!existente) throw criarErro('Empresa não encontrada', 404);
  const updates = sanitizeEmpresa(payload || {});
  return EmpresaModel.update(id, updates);
}

async function remover(id) {
  const existente = await EmpresaModel.findById(id);
  if (!existente) throw criarErro('Empresa não encontrada', 404);
  await EmpresaModel.delete(id);
  return true;
}

module.exports = { criar, listar, buscarPorId, atualizar, remover };
