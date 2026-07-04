'use strict'

const repositorio = require('../repositorios/farmacos.repositorio');

module.exports = {
  async listar(fastify, filtros) {
    const rows = await repositorio.listar(fastify, filtros);
    if (!rows || rows.length === 0) return [];

    const ids = rows.map(r => r.id);
    const categorias = await repositorio.listarCategoriasPorFarmacoIds(fastify, ids);

    const map = {};
    for (const c of categorias) {
      if (!map[c.farmaco_id]) map[c.farmaco_id] = [];
      map[c.farmaco_id].push({ id: c.id, nome: c.nome, chave: c.chave, ativo: c.ativo, ordem: c.ordem });
    }

    return rows.map(r => ({ ...r, categorias: map[r.id] || [] }));
  },

  async obterPorId(fastify, id) {
    const registro = await repositorio.buscarPorId(fastify, id);
    if (!registro) return null;
    const categorias = await repositorio.listarCategoriasPorFarmacoIds(fastify, [id]);
    registro.categorias = categorias && categorias.length ? categorias.map(c => ({ id: c.id, nome: c.nome, chave: c.chave, ativo: c.ativo, ordem: c.ordem })) : [];
    return registro;
  },

  async listarPorCategoria(fastify, categoria_chave) {
    // verificar existencia da categoria
    const [cats] = await fastify.mysql.query('SELECT id, nome, chave, ativo, ordem FROM categorias_farmacos WHERE chave = ? LIMIT 1', [categoria_chave]);
    if (!cats || cats.length === 0) {
      const err = new Error('categoria nao encontrada');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const rows = await repositorio.listarPorCategoriaChave(fastify, categoria_chave);
    if (!rows || rows.length === 0) return [];

    const ids = rows.map(r => r.id);
    const categorias = await repositorio.listarCategoriasPorFarmacoIds(fastify, ids);
    const map = {};
    for (const c of categorias) {
      if (!map[c.farmaco_id]) map[c.farmaco_id] = [];
      map[c.farmaco_id].push({ id: c.id, nome: c.nome, chave: c.chave, ativo: c.ativo, ordem: c.ordem });
    }

    return rows.map(r => ({ ...r, categorias: map[r.id] || [] }));
  }
};
