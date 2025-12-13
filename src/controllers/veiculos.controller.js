const service = require('../services/veiculos.service');

async function list(req, res, next) {
  try {
    const data = await service.list();
    res.json(data);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const created = await service.create(req.body || {});
    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await service.update(id, req.body || {});
    res.json(updated);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await service.remove(id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };