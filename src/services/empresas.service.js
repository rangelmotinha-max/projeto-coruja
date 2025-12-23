const EmpresaModel = require('../models/empresas.model');
const { criarErro } = require('../utils/helpers');

function sanitizeEmpresa(payload) {
  const cnpjDigits = String(payload.cnpj || '').replace(/\D/g, '');
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
    telefone: telefone || null,
    enderecos: require('../utils/validators').validarEnderecos(payload.enderecos || []),
    socios,
  };
}

async function criar(payload) {
  const dados = sanitizeEmpresa(payload || {});
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

  const temFiltro = filtroCnpj || filtroRazao || filtroSocioTexto || filtroSocioDigitos || filtroEnderecoTexto || filtroCep;
  if (!temFiltro) return empresas;

  return empresas.filter((empresa) => {
    const cnpjEmpresa = somenteDigitos(empresa.cnpj);
    const razao = normalizarTexto(empresa.razaoSocial);
    const fantasia = normalizarTexto(empresa.nomeFantasia);

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

    return cnpjAtende && razaoAtende && socioAtende && enderecoTextoAtende && cepAtende;
  });
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
