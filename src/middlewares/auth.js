const jwt = require('jsonwebtoken');
const { criarErro } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function extrairToken(req) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  if (tipo === 'Bearer' && token) return token;
  return null;
}

function authMiddleware(req, res, next) {
  try {
    const token = extrairToken(req);
    if (!token) {
      throw criarErro('Token não fornecido', 401);
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(criarErro('Token inválido ou expirado', 401));
    }
    return next(error);
  }
}

module.exports = authMiddleware;
