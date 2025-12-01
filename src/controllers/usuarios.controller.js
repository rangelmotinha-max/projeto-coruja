const usuarioService = require('../services/usuarios.service');

async function registrar(req, res, next) {
  try {
    const resultado = await usuarioService.registrar(req.body);
    return res.status(201).json(resultado);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const resultado = await usuarioService.autenticar(req.body);
    return res.json(resultado);
  } catch (error) {
    return next(error);
  }
}

async function listar(req, res, next) {
  try {
    // Comentário: envia filtros vindos da querystring para o serviço
    const usuarios = await usuarioService.listar({
      nome: req.query?.nome,
      email: req.query?.email,
      role: req.query?.role,
    });
    return res.json(usuarios);
  } catch (error) {
    return next(error);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const usuario = await usuarioService.buscarPorId(req.params.id);
    return res.json(usuario);
  } catch (error) {
    return next(error);
  }
}

async function atualizar(req, res, next) {
  try {
    const usuario = await usuarioService.atualizar(req.params.id, req.body, req.user);
    return res.json(usuario);
  } catch (error) {
    return next(error);
  }
}

async function remover(req, res, next) {
  try {
    await usuarioService.remover(req.params.id, req.user);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registrar,
  login,
  listar,
  buscarPorId,
  atualizar,
  remover,
};
