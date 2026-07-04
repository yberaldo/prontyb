'use strict'

const controlador = require('../controladores/prontuarios_anestesicos.controlador');

module.exports = function (fastify, opts, done) {
  fastify.get('/prontuarios_anestesicos', controlador.listar);
  fastify.get('/prontuarios_anestesicos/:id', controlador.buscarPorId);
  fastify.post('/prontuarios_anestesicos', controlador.criar);
  fastify.put('/prontuarios_anestesicos/:id', controlador.atualizar);
  done();
};
