'use strict'

module.exports = function (fastify, opts, done) {
  // Rota para verificar status do banco
  fastify.get('/banco/status', async (request, reply) => {
    try {
      const [rows] = await fastify.mysql.query('SELECT 1 AS conectado');
      if (rows && rows.length > 0 && rows[0].conectado === 1) {
        reply.send({ ok: true, mensagem: 'banco conectado' });
      } else {
        reply.code(500).send({ ok: false, mensagem: 'banco nao respondeu corretamente' });
      }
    } catch (err) {
      // nao expor detalhes sensiveis na resposta
      fastify.log.error('Erro ao checar banco:', err.message);
      reply.code(500).send({ ok: false, mensagem: 'falha ao conectar com o banco' });
    }
  });

  done();
};
