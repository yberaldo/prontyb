'use strict'

const controlador = require('../controladores/medicacoes_prontuario.controlador');

module.exports = function (fastify, opts, done) {
  // listar
  fastify.get('/prontuarios_anestesicos/:prontuario_id/medicacoes', controlador.listar);

  // criar
  fastify.post('/prontuarios_anestesicos/:prontuario_id/medicacoes', controlador.criar);

  // atualizar
  fastify.put('/prontuarios_anestesicos/:prontuario_id/medicacoes/:medicacao_id', controlador.atualizar);

  // remover
  fastify.delete('/prontuarios_anestesicos/:prontuario_id/medicacoes/:medicacao_id', controlador.remover);

  done();
};
