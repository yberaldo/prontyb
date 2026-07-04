'use strict'

const controlador = require('../controladores/farmacos.controlador');

module.exports = function (fastify, opts, done) {
  // rota específica de categoria deve vir antes da rota por id
  fastify.get('/farmacos', controlador.listar);
  fastify.get('/farmacos/categoria/:categoria_chave', controlador.listarPorCategoria);
  fastify.get('/farmacos/:id', controlador.buscarPorId);

  done();
};
