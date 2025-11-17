const bcrypt = require('bcryptjs');
const { initDatabase } = require('../src/database/sqlite');
const UsuarioModel = require('../src/models/usuarios.model');

const ADMIN_NOME = 'Administrador Coruja';
const ADMIN_EMAIL = 'admin@coruja.local';
const ADMIN_SENHA = 'coruja-admin-123';

async function seedAdmin() {
  const db = await initDatabase();
  const adminExistente = await db.get('SELECT * FROM usuarios WHERE role = ?', ['admin']);

  if (adminExistente) {
    console.log('Usuário administrador já existe. Nenhuma alteração realizada.');
    return null;
  }

  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);
  const adminCriado = await UsuarioModel.create({
    nome: ADMIN_NOME,
    email: ADMIN_EMAIL,
    senhaHash,
    role: 'admin',
  });

  console.log(`Usuário administrador criado com email: ${ADMIN_EMAIL}`);
  return adminCriado;
}

module.exports = { seedAdmin };

if (require.main === module) {
  (async () => {
    try {
      await seedAdmin();
    } catch (erro) {
      console.error('Falha ao executar seed de administrador:', erro);
      process.exitCode = 1;
    }
  })();
}
