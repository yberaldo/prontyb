'use strict'

const repositorio = require('../repositorios/doses_farmacos.repositorio');

module.exports = {
  async listar(fastify, filtros) {
    const rows = await repositorio.listar(fastify, filtros);
    if (!rows || rows.length === 0) return [];

    const farmacoIds = Array.from(new Set(rows.map(r => r.farmaco_id)));
    const farmacos = await repositorio.buscarFarmacosBasicosPorIds(fastify, farmacoIds);
    const map = {};
    for (const f of farmacos) map[f.id] = f;

    return rows.map(r => ({ ...r, farmaco: map[r.farmaco_id] || null }));
  },

  async obterPorId(fastify, id) {
    const registro = await repositorio.buscarPorId(fastify, id);
    if (!registro) return null;
    const farmacos = await repositorio.buscarFarmacosBasicosPorIds(fastify, [registro.farmaco_id]);
    registro.farmaco = farmacos && farmacos.length ? farmacos[0] : null;
    return registro;
  },

  async listarPorFarmaco(fastify, farmaco_id, filtros) {
    // validar existencia do farmaco
    const [found] = await fastify.mysql.query('SELECT id FROM farmacos WHERE id = ? LIMIT 1', [farmaco_id]);
    if (!found || found.length === 0) {
      const err = new Error('farmaco nao encontrado');
      err.code = 'NOT_FOUND';
      throw err;
    }

    // agregar filtros possiveis: categoria_chave, especie, via, ativo
    const rows = await repositorio.listarPorFarmacoId(fastify, farmaco_id);
    if (!rows || rows.length === 0) return [];

    const farmacos = await repositorio.buscarFarmacosBasicosPorIds(fastify, [farmaco_id]);
    const farmaco = farmacos && farmacos.length ? farmacos[0] : null;
    return rows.map(r => ({ ...r, farmaco }));
  }
};
