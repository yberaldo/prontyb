'use strict'

// Opcional: configuracao de conexao (pode ser usada pelo plugin de banco)
const env = require('./ambiente');

module.exports = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
