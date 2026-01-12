const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Comentário: chave da API do Google Maps para geocodificação/JS API
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
};

module.exports = env;
