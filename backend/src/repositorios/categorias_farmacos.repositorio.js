'use strict'

// Repositorio para tabela categorias_farmacos (somente leitura)
module.exports = {
  async listar(fastify, { busca = null, ativo = null } = {}) {
    const params = [];
    const where = [];

    if (busca) {
      const like = `%${busca}%`;
      where.push('(nome LIKE ? OR chave LIKE ?)');
      params.push(like, like);
    }

    if (ativo !== null && typeof ativo !== 'undefined') {
      where.push('ativo = ?');
      params.push(ativo ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT id, nome, chave, ativo, ordem, criado_em, atualizado_em FROM categorias_farmacos ${whereSql} ORDER BY ordem ASC, nome ASC`;
    const [rows] = await fastify.mysql.query(sql, params);
    return rows;
  },

  async buscarPorId(fastify, id) {
    const sql = `SELECT id, nome, chave, ativo, ordem, criado_em, atualizado_em FROM categorias_farmacos WHERE id = ? LIMIT 1`;
    const [rows] = await fastify.mysql.query(sql, [id]);
    return rows && rows.length ? rows[0] : null;
  }
};
