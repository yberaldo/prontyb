'use strict'

module.exports = function (fastify, opts, done) {
  // Rota de saude do servico
  fastify.get('/saude', async (request, reply) => {
    reply.send({
      ok: true,
      servico: 'backend_prontuario_anestesico',
      mensagem: 'API em execucao'
    });
  });

  done();
};
