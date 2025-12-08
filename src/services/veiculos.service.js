const model = require('../models/veiculos.model');

const somenteDigitos = (v) => String(v || '').replace(/\D/g, '');
const normalizarPlaca = (placa) => String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);

function validarCpf(cpf) {
  const sn = somenteDigitos(cpf);
  if (sn.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(sn)) return false;
  let soma = 0; for (let i=0;i<9;i++) soma += parseInt(sn[i]) * (10-i);
  let d1 = 11 - (soma % 11); d1 = d1>9?0:d1; if (parseInt(sn[9]) !== d1) return false;
  soma = 0; for (let i=0;i<10;i++) soma += parseInt(sn[i]) * (11-i);
  let d2 = 11 - (soma % 11); d2 = d2>9?0:d2; if (parseInt(sn[10]) !== d2) return false;
  return true;
}

function sanitize(input) {
  const out = { ...input };
  out.cpfProprietario = somenteDigitos(out.cpfProprietario);
  out.placa = normalizarPlaca(out.placa);
  out.anoModelo = String(out.anoModelo || '').replace(/\D/g,'').slice(0,4);
  return out;
}

async function list() { return model.listAll(); }
async function create(data) {
  const v = sanitize(data);
  if (!validarCpf(v.cpfProprietario)) {
    const err = new Error('CPF inválido'); err.status = 400; throw err;
  }
  return model.create(v);
}
async function update(id, data) {
  const v = sanitize(data);
  if (!validarCpf(v.cpfProprietario)) {
    const err = new Error('CPF inválido'); err.status = 400; throw err;
  }
  return model.update(id, v);
}
async function remove(id) { return model.remove(id); }

module.exports = { list, create, update, remove };