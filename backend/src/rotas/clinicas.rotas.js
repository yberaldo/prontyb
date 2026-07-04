'use strict'

const controlador = require('../controladores/clinicas.controlador');

module.exports = function (fastify, opts, done) {
  fastify.get('/clinicas', controlador.listar);
  fastify.get('/clinicas/:id', controlador.buscarPorId);
  fastify.post('/clinicas', controlador.criar);
  fastify.put('/clinicas/:id', controlador.atualizar);
  fastify.patch('/clinicas/:id/ativar', controlador.ativar);
  fastify.patch('/clinicas/:id/desativar', controlador.desativar);

  done();
};
