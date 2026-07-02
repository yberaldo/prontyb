'use strict'

// Carrega variaveis de ambiente do arquivo .env na raiz do backend
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// variaveis de ambiente exportadas (nomes em portugues, sem acentos)
module.exports = {
  PORTA: process.env.PORTA || '3000',
  HOST: process.env.HOST || '0.0.0.0',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'prontuario_anestesico_veterinario'
};
