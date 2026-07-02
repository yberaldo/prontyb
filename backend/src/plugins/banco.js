'use strict'

// Plugin que cria e registra um pool mysql2/promise em fastify.mysql
const mysql = require('mysql2/promise');
const env = require('../configuracoes/ambiente');

module.exports = async function (fastify, opts) {
  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // tornar o pool disponivel como fastify.mysql
  fastify.decorate('mysql', pool);

  // fechar o pool quando o servidor encerrar
  fastify.addHook('onClose', async (instance) => {
    try {
      await pool.end();
      fastify.log.info('Pool MySQL fechado');
    } catch (err) {
      fastify.log.error('Erro fechando pool MySQL', err);
    }
  });
};
