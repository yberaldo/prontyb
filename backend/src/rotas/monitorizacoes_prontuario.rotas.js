'use strict'

const controlador = require('../controladores/monitorizacoes_prontuario.controlador');

module.exports = function (fastify, opts, done) {
  fastify.get('/prontuarios_anestesicos/:prontuario_id/monitorizacoes', controlador.listar);

  fastify.get('/prontuarios_anestesicos/:prontuario_id/monitorizacoes/:monitorizacao_extraida_id', controlador.buscar);

  fastify.get('/prontuarios_anestesicos/:prontuario_id/monitorizacoes/:monitorizacao_extraida_id/linhas', controlador.listarLinhas);

  done();
};
