'use strict'

const controlador = require('../controladores/monitorizacoes_prontuario.controlador');

module.exports = function (fastify, opts, done) {
  fastify.get('/prontuarios_anestesicos/:prontuario_id/monitorizacoes', controlador.listar);

  fastify.get('/prontuarios_anestesicos/:prontuario_id/monitorizacoes/:monitorizacao_extraida_id', controlador.buscar);

  fastify.get('/prontuarios_anestesicos/:prontuario_id/monitorizacoes/:monitorizacao_extraida_id/linhas', controlador.listarLinhas);

  fastify.post('/prontuarios_anestesicos/:prontuario_id/monitorizacoes/:monitorizacao_extraida_id/processamento-manual', controlador.processarManual);

  fastify.post('/prontuarios_anestesicos/:prontuario_id/monitorizacoes/:monitorizacao_extraida_id/revisar', controlador.revisar);

  done();
};
