'use strict'

const controlador = require('../controladores/doses_farmacos.controlador');

module.exports = function (fastify, opts, done) {
  fastify.get('/doses_farmacos', controlador.listar);
  fastify.get('/doses_farmacos/farmaco/:farmaco_id', controlador.listarPorFarmaco);
  fastify.get('/doses_farmacos/:id', controlador.buscarPorId);
  done();
};
