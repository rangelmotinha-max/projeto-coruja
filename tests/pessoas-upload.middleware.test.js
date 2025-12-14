const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const fs = require('node:fs/promises');

// Importa o router para reutilizar o middleware condicional
const pessoasRoutes = require('../src/routes/pessoas.routes');
const conditionalUploadPessoaArquivos = pessoasRoutes.conditionalUploadPessoaArquivos;

// Função auxiliar para montar um app mínimo apenas com o middleware e um handler de eco
function criarApp(handler) {
  const app = express();
  app.use(express.json());
  app.put('/pessoas/:id', conditionalUploadPessoaArquivos, handler);
  return app;
}

test('PUT com JSON puro não dispara multer nem limpa o corpo', async () => {
  // Comentário: valida que requisições application/json seguem direto para o controller
  const app = criarApp((req, res) => {
    res.status(200).json({ corpo: req.body, arquivos: req.files });
  });

  const resposta = await request(app)
    .put('/pessoas/42')
    .set('Content-Type', 'application/json')
    .send({ nome: 'Pessoa Sem Foto' })
    .expect(200);

  assert.deepEqual(resposta.body.corpo, { nome: 'Pessoa Sem Foto' });
  assert.equal(resposta.body.arquivos, undefined);
});

test('PUT multipart dispara multer e preserva campos junto aos arquivos', async () => {
  // Comentário: confirma que multipart/form-data é tratado pelo multer e repassa arquivos
  const uploads = [];
  const app = criarApp((req, res) => {
    uploads.push(...(req.files?.fotos || []).map((file) => file.path));
    res.status(200).json({
      corpo: req.body,
      arquivos: {
        fotos: req.files?.fotos?.length || 0,
      },
    });
  });

  const resposta = await request(app)
    .put('/pessoas/7')
    .field('nomeCompleto', 'Pessoa Com Foto')
    .attach('fotos', Buffer.from('PNG'), { filename: 'foto-teste.png', contentType: 'image/png' })
    .expect(200);

  assert.equal(resposta.body.arquivos.fotos, 1);
  assert.equal(resposta.body.corpo.nomeCompleto, 'Pessoa Com Foto');

  // Limpa arquivos escritos no disco durante o teste
  await Promise.all(uploads.map((arquivo) => fs.rm(arquivo, { force: true })));
});
