'use strict'

const controlador = require('../controladores/petlove.controlador');

module.exports = function (fastify, opts, done) {
  fastify.post('/petlove/pacientes/buscar-por-microchip', controlador.buscarPorMicrochip);

  done();
};
