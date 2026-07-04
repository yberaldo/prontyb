'use strict'

// Repositório read-only para tabela `doses_farmacos`
module.exports = {
  async listar(fastify, { farmaco_id = null, categoria_chave = null, especie = null, via = null, ativo = null } = {}) {
    const params = [];
    const where = [];

    if (farmaco_id !== null && typeof farmaco_id !== 'undefined') {
      where.push('farmaco_id = ?');
      params.push(farmaco_id);
    }

    if (ativo !== null && typeof ativo !== 'undefined') {
      where.push('ativo = ?');
      params.push(ativo ? 1 : 0);
    }

    // categoria_chave não está na tabela doses_farmacos, mas existe em farmacos_categorias
    if (categoria_chave) {
      where.push('EXISTS (SELECT 1 FROM farmacos_categorias fc WHERE fc.farmaco_id = doses_farmacos.farmaco_id AND fc.categoria_chave = ?)');
      params.push(categoria_chave);
    }

    // 'especie' e 'via' não existem na migration de doses_farmacos -> ignorados

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // ordenar por farmaco_id ASC, depois por id ASC (não existe coluna 'ordem' na migration)
    const sql = `SELECT id, farmaco_id, rotulo, valor, unidade, permite_edicao, ativo FROM doses_farmacos ${whereSql} ORDER BY farmaco_id ASC, id ASC`;
    const [rows] = await fastify.mysql.query(sql, params);
    return rows;
  },

  async buscarPorId(fastify, id) {
    const sql = `SELECT id, farmaco_id, rotulo, valor, unidade, permite_edicao, ativo FROM doses_farmacos WHERE id = ? LIMIT 1`;
    const [rows] = await fastify.mysql.query(sql, [id]);
    return rows && rows.length ? rows[0] : null;
  },

  async listarPorFarmacoId(fastify, farmaco_id) {
    const sql = `SELECT id, farmaco_id, rotulo, valor, unidade, permite_edicao, ativo FROM doses_farmacos WHERE farmaco_id = ? ORDER BY id ASC`;
    const [rows] = await fastify.mysql.query(sql, [farmaco_id]);
    return rows;
  },

  async buscarFarmacosBasicosPorIds(fastify, ids) {
    if (!ids || !ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT id, nome, unidade_padrao, concentracao_padrao, permite_dose_livre, ativo FROM farmacos WHERE id IN (${placeholders})`;
    const [rows] = await fastify.mysql.query(sql, ids);
    return rows;
  }
};
