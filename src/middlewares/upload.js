const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Diretório de armazenamento de fotos de pessoas
const uploadDir = path.join(__dirname, '../../public/uploads/pessoas');
fs.mkdirSync(uploadDir, { recursive: true });

// Configuração do multer com validações de tipo/tamanho no próprio middleware
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const extensao = path.extname(file.originalname) || '';
    const nomeSeguro = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`;
    cb(null, nomeSeguro);
  },
});

const fileFilter = (_req, file, cb) => {
  const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
  if (!permitidos.includes(file.mimetype)) {
    return cb(new Error('Tipo de imagem não suportado. Envie PNG, JPG ou WEBP.'));
  }
  cb(null, true);
};

// Limite de 5MB por imagem, coerente com a validação de negócio
const uploadFotosPessoa = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

module.exports = { uploadFotosPessoa };
