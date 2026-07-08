'use strict'

const { criarControladorPetlove } = require('../controladores/petlove.controlador');

module.exports = function (fastify, opts, done) {
  const controlador = criarControladorPetlove(opts.servicoConsulta);
  fastify.post('/petlove/pacientes/buscar-por-microchip', controlador.buscarPorMicrochip);

  done();
};
