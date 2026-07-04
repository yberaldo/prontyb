'use strict'

const controlador = require('../controladores/profissionais.controlador');

module.exports = function (fastify, opts, done) {
  fastify.get('/profissionais', controlador.listar);
  fastify.get('/profissionais/:id', controlador.buscarPorId);
  fastify.get('/profissionais/anestesistas', controlador.listarAnestesistas);
  fastify.get('/profissionais/cirurgioes', controlador.listarCirurgioes);
  fastify.post('/profissionais', controlador.criar);
  fastify.put('/profissionais/:id', controlador.atualizar);
  fastify.patch('/profissionais/:id/ativar', controlador.ativar);
  fastify.patch('/profissionais/:id/desativar', controlador.desativar);

  done();
};
