'use strict'

const controlador = require('../controladores/anexos_prontuario.controlador');

module.exports = function (fastify, opts, done) {
  // listar
  fastify.get('/prontuarios_anestesicos/:prontuario_id/anexos', controlador.listar);

  // buscar
  fastify.get('/prontuarios_anestesicos/:prontuario_id/anexos/:anexo_id', controlador.buscar);

  // criar metadata
  fastify.post('/prontuarios_anestesicos/:prontuario_id/anexos', controlador.criar);

  // remover metadata
  fastify.delete('/prontuarios_anestesicos/:prontuario_id/anexos/:anexo_id', controlador.remover);

  done();
};
