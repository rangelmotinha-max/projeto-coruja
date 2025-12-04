function authorize(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const role = req.user?.role;
      if (!role) return res.status(401).json({ mensagem: 'Não autenticado' });

      if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
        return next();
      }

      return res.status(403).json({ mensagem: 'Ação não permitida. Contate o Administrador!' });
    } catch (err) {
      return res.status(500).json({ mensagem: 'Erro de autorização' });
    }
  };
}

module.exports = authorize;