'use strict'

const repositorio = require('../repositorios/categorias_farmacos.repositorio');

module.exports = {
  async listar(fastify, filtros) {
    return repositorio.listar(fastify, filtros);
  },

  async obterPorId(fastify, id) {
    return repositorio.buscarPorId(fastify, id);
  }
};
