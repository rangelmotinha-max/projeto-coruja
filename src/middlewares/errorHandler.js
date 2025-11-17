function formatarDetalhes(err) {
  if (err.details) return err.details;
  if (err.errors) return err.errors;
  return undefined;
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  const detalhes = formatarDetalhes(err);

  const resposta = { message };
  if (detalhes) resposta.details = detalhes;

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    resposta.stack = err.stack;
  }

  return res.status(statusCode).json(resposta);
}

module.exports = errorHandler;
