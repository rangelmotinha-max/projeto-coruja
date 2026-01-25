const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Diretórios de armazenamento para diferentes tipos de upload
const uploadDirFotos = path.join(__dirname, '../../public/uploads/pessoas');
const uploadDirDocumentos = path.join(__dirname, '../../public/uploads/ocorrencias');
const uploadDirEntidades = path.join(__dirname, '../../public/uploads/entidades');
const uploadDirEmpresas = path.join(__dirname, '../../public/uploads/empresas');
// Garante que os diretórios existam antes de receber arquivos
fs.mkdirSync(uploadDirFotos, { recursive: true });
fs.mkdirSync(uploadDirDocumentos, { recursive: true });
fs.mkdirSync(uploadDirEntidades, { recursive: true });
fs.mkdirSync(uploadDirEmpresas, { recursive: true });

// Configuração do multer com validações de tipo/tamanho no próprio middleware
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    // Fotos continuam em "pessoas"; documentos de ocorrência vão para o diretório próprio
    const destino = (file.fieldname === 'documentosOcorrenciasPoliciais' || file.fieldname === 'imagensMonitoramento')
      ? uploadDirDocumentos
      : uploadDirFotos;
    cb(null, destino);
  },
  filename: (_req, file, cb) => {
    const extensao = path.extname(file.originalname) || '';
    const nomeSeguro = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`;
    cb(null, nomeSeguro);
  },
});

const fileFilter = (_req, file, cb) => {
  // Comentário: validação diferenciada por campo para manter segurança e flexibilidade
  const tiposImagem = ['image/jpeg', 'image/png', 'image/webp'];
  const tiposDocumento = [
    ...tiposImagem,
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (file.fieldname === 'documentosOcorrenciasPoliciais') {
    if (!tiposDocumento.includes(file.mimetype)) {
      return cb(new Error('Tipo de documento não suportado. Envie PDF, DOC, DOCX ou imagens.'));
    }
    return cb(null, true);
  }

  if (!tiposImagem.includes(file.mimetype)) {
    return cb(new Error('Tipo de imagem não suportado. Envie PNG, JPG ou WEBP.'));
  }
  return cb(null, true);
};

// Limite de 20MB para contemplar documentos de Ocorrências Policiais
const uploadPessoaArquivos = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
});

// Armazenador específico para fotos de entidades, mantendo nomes únicos e previsíveis
const storageEntidades = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirEntidades),
  filename: (_req, file, cb) => {
    const extensao = path.extname(file.originalname) || '';
    const nomeSeguro = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`;
    cb(null, nomeSeguro);
  },
});

// Apenas imagens são aceitas para o cadastro de entidades
const uploadEntidadeFotos = multer({
  storage: storageEntidades,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const tiposImagem = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposImagem.includes(file.mimetype)) {
      return cb(new Error('Tipo de imagem não suportado. Envie PNG, JPG ou WEBP.'));
    }
    cb(null, true);
  },
});

module.exports = { uploadPessoaArquivos, uploadEntidadeFotos };

// Configuração dedicada para fotos de empresas
const storageEmpresas = multer.diskStorage({
  destination: (_req, file, cb) => cb(null, uploadDirEmpresas),
  filename: (_req, file, cb) => {
    const extensao = path.extname(file.originalname) || '';
    const nomeSeguro = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`;
    cb(null, nomeSeguro);
  },
});

const tiposImagem = ['image/jpeg', 'image/png', 'image/webp'];
const uploadEmpresaFotos = multer({
  storage: storageEmpresas,
  // Aumenta limite para 20MB, alinhado com documentos de ocorrências
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!tiposImagem.includes(file.mimetype)) {
      return cb(new Error('Tipo de imagem não suportado. Envie PNG, JPG ou WEBP.'));
    }
    cb(null, true);
  },
});

module.exports.uploadEmpresaFotos = uploadEmpresaFotos;
