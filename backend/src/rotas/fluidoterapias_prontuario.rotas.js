'use strict'

const controlador = require('../controladores/fluidoterapias_prontuario.controlador');

module.exports = function (fastify, opts, done) {
  // listar
  fastify.get('/prontuarios_anestesicos/:prontuario_id/fluidoterapias', controlador.listar);

  // criar
  fastify.post('/prontuarios_anestesicos/:prontuario_id/fluidoterapias', controlador.criar);

  // atualizar
  fastify.put('/prontuarios_anestesicos/:prontuario_id/fluidoterapias/:fluidoterapia_id', controlador.atualizar);

  // remover
  fastify.delete('/prontuarios_anestesicos/:prontuario_id/fluidoterapias/:fluidoterapia_id', controlador.remover);

  done();
};
