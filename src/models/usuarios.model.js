const { randomUUID } = require('crypto');

class UsuarioModel {
  constructor() {
    this.usuarios = [];
  }

  static get collection() {
    if (!this._collection) {
      this._collection = [];
    }
    return this._collection;
  }

  static async create({ nome, email, senhaHash, role = 'user' }) {
    const now = new Date().toISOString();
    const usuario = {
      id: randomUUID(),
      nome,
      email: email.toLowerCase(),
      senhaHash,
      role,
      criadoEm: now,
      atualizadoEm: now,
    };

    this.collection.push(usuario);
    return { ...usuario };
  }

  static async findAll() {
    return this.collection.map((usuario) => ({ ...usuario }));
  }

  static async findByEmail(email) {
    return this.collection.find(
      (usuario) => usuario.email === (email || '').toLowerCase()
    );
  }

  static async findById(id) {
    return this.collection.find((usuario) => usuario.id === id);
  }

  static async update(id, updates) {
    const usuario = await this.findById(id);
    if (!usuario) return null;

    Object.assign(usuario, updates, { atualizadoEm: new Date().toISOString() });
    return { ...usuario };
  }

  static async delete(id) {
    const index = this.collection.findIndex((usuario) => usuario.id === id);
    if (index === -1) return false;

    this.collection.splice(index, 1);
    return true;
  }
}

module.exports = UsuarioModel;
