const { randomUUID } = require('crypto');
const { initDatabase } = require('../database/sqlite');

class UsuarioModel {
  static async create({ nome, email, senhaHash, role = 'user' }) {
    const db = await initDatabase();
    const agora = new Date().toISOString();
    const usuario = {
      id: randomUUID(),
      nome,
      email: email.toLowerCase(),
      senhaHash,
      role,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await db.run(
      `INSERT INTO usuarios (id, nome, email, senhaHash, role, criadoEm, atualizadoEm)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario.id,
        usuario.nome,
        usuario.email,
        usuario.senhaHash,
        usuario.role,
        usuario.criadoEm,
        usuario.atualizadoEm,
      ]
    );

    return { ...usuario };
  }

  static async findAll() {
    const db = await initDatabase();
    const usuarios = await db.all('SELECT * FROM usuarios');
    return usuarios.map((usuario) => ({ ...usuario }));
  }

  static async findByEmail(email) {
    if (!email) return null;
    const db = await initDatabase();
    return db.get('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase()]);
  }

  static async findById(id) {
    const db = await initDatabase();
    return db.get('SELECT * FROM usuarios WHERE id = ?', [id]);
  }

  static async update(id, updates) {
    const db = await initDatabase();
    const campos = [];
    const valores = [];

    if (updates.nome !== undefined) {
      campos.push('nome = ?');
      valores.push(updates.nome);
    }
    if (updates.email !== undefined) {
      campos.push('email = ?');
      valores.push(updates.email.toLowerCase());
    }
    if (updates.senhaHash !== undefined) {
      campos.push('senhaHash = ?');
      valores.push(updates.senhaHash);
    }
    if (updates.role !== undefined) {
      campos.push('role = ?');
      valores.push(updates.role);
    }

    campos.push('atualizadoEm = ?');
    valores.push(new Date().toISOString());
    valores.push(id);

    const result = await db.run(
      `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    if (!result.changes) return null;
    return this.findById(id);
  }

  static async delete(id) {
    const db = await initDatabase();
    const result = await db.run('DELETE FROM usuarios WHERE id = ?', [id]);
    return result.changes > 0;
  }
}

module.exports = UsuarioModel;
