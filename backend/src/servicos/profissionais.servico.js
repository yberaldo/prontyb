'use strict'

const repositorio = require('../repositorios/profissionais.repositorio');

const funcoesValidas = ['cirurgiao', 'anestesista', 'ambos'];

module.exports = {
  async listar(fastify, filtros) {
    return repositorio.listar(fastify, filtros);
  },

  async obterPorId(fastify, id) {
    return repositorio.buscarPorId(fastify, id);
  },

  async criar(fastify, dados) {
    // validar funcao
    if (!dados.funcao || !funcoesValidas.includes(dados.funcao)) {
      const err = new Error('funcao invalida');
      err.code = 'INVALIDA_FUNCAO';
      throw err;
    }

    const insertId = await repositorio.criar(fastify, dados);
    return repositorio.buscarPorId(fastify, insertId);
  },

  async atualizar(fastify, id, dados) {
    // validar funcao se informada
    if (Object.prototype.hasOwnProperty.call(dados, 'funcao')) {
      if (!funcoesValidas.includes(dados.funcao)) return null;
    }

    const existente = await repositorio.buscarPorId(fastify, id);
    if (!existente) return null;

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
