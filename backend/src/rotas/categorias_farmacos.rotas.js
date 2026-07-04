'use strict'

const controlador = require('../controladores/categorias_farmacos.controlador');

module.exports = function (fastify, opts, done) {
  fastify.get('/categorias_farmacos', controlador.listar);
  fastify.get('/categorias_farmacos/:id', controlador.buscarPorId);

  done();
};
