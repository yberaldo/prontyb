'use strict'

module.exports = function (fastify, opts, done) {
  // Rota para verificar status do banco
  fastify.get('/banco/status', async (request, reply) => {
    // verificar se o plugin registrou o pool
    if (!fastify.hasDecorator || !fastify.hasDecorator('mysql')) {
      fastify.log.error('Plugin mysql nao registrado no fastify');
      return reply.code(500).send({ ok: false, mensagem: 'falha ao conectar com o banco' });
    }

    try {
      const [rows] = await fastify.mysql.query('SELECT 1 AS conectado');
      if (rows && rows.length > 0 && rows[0].conectado === 1) {
        reply.send({ ok: true, mensagem: 'banco conectado' });
      } else {
        reply.code(500).send({ ok: false, mensagem: 'banco nao respondeu corretamente' });
      }
    } catch (err) {
      // log estruturado para debug sem expor credenciais
      fastify.log.error({
        erro: err && err.message ? err.message : String(err),
        code: err && err.code ? err.code : null,
        errno: err && err.errno ? err.errno : null,
        sqlState: err && err.sqlState ? err.sqlState : null
      }, 'Erro ao checar banco');
      reply.code(500).send({ ok: false, mensagem: 'falha ao conectar com o banco' });
    }
  });

  done();
};
