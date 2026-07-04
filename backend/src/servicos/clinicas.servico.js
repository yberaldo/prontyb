'use strict'

const repositorio = require('../repositorios/clinicas.repositorio');

module.exports = {
  async listar(fastify, filtros) {
    return repositorio.listar(fastify, filtros);
  },

  async obterPorId(fastify, id) {
    return repositorio.buscarPorId(fastify, id);
  },

  async criar(fastify, dados) {
    const insertId = await repositorio.criar(fastify, dados);
    return repositorio.buscarPorId(fastify, insertId);
  },

  async atualizar(fastify, id, dados) {
    // verificar existencia
    const existente = await repositorio.buscarPorId(fastify, id);
    if (!existente) {
      return null;
    }
    await repositorio.atualizar(fastify, id, dados);
    return repositorio.buscarPorId(fastify, id);
  },

  async ativar(fastify, id) {
    const existente = await repositorio.buscarPorId(fastify, id);
    if (!existente) return null;
    await repositorio.definirAtivo(fastify, id, 1);
    return repositorio.buscarPorId(fastify, id);
  },

  async desativar(fastify, id) {
    const existente = await repositorio.buscarPorId(fastify, id);
    if (!existente) return null;
    await repositorio.definirAtivo(fastify, id, 0);
    return repositorio.buscarPorId(fastify, id);
  }
};
