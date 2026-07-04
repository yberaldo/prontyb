'use strict'

// Repositório para tabela `farmacos` (somente leitura)
module.exports = {
  async listar(fastify, { busca = null, ativo = null, categoria_chave = null } = {}) {
    const params = [];
    const where = [];

    if (busca) {
      const like = `%${busca}%`;
      // procurar em colunas textuais existentes
      where.push('(nome LIKE ? OR concentracao_padrao LIKE ?)');
      params.push(like, like);
    }

    if (ativo !== null && typeof ativo !== 'undefined') {
      where.push('ativo = ?');
      params.push(ativo ? 1 : 0);
    }

    if (categoria_chave) {
      // filtra por existência de vínculo na tabela de junção
      where.push('EXISTS (SELECT 1 FROM farmacos_categorias fc WHERE fc.farmaco_id = farmacos.id AND fc.categoria_chave = ?)');
      params.push(categoria_chave);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT id, nome, unidade_padrao, concentracao_padrao, permite_dose_livre, ativo, criado_em, atualizado_em FROM farmacos ${whereSql} ORDER BY nome ASC`;
    const [rows] = await fastify.mysql.query(sql, params);
    return rows;
  },

  async buscarPorId(fastify, id) {
    const sql = `SELECT id, nome, unidade_padrao, concentracao_padrao, permite_dose_livre, ativo, criado_em, atualizado_em FROM farmacos WHERE id = ? LIMIT 1`;
    const [rows] = await fastify.mysql.query(sql, [id]);
    return rows && rows.length ? rows[0] : null;
  },

  async listarCategoriasPorFarmacoIds(fastify, farmacoIds) {
    if (!farmacoIds || !farmacoIds.length) return [];
    const placeholders = farmacoIds.map(() => '?').join(',');
    const sql = `SELECT fc.farmaco_id, c.id, c.nome, c.chave, c.ativo, c.ordem FROM farmacos_categorias fc JOIN categorias_farmacos c ON fc.categoria_chave = c.chave WHERE fc.farmaco_id IN (${placeholders}) ORDER BY c.ordem ASC, c.nome ASC`;
    const [rows] = await fastify.mysql.query(sql, farmacoIds);
    return rows;
  },

  async listarPorCategoriaChave(fastify, categoria_chave) {
    const sql = `SELECT f.id, f.nome, f.unidade_padrao, f.concentracao_padrao, f.permite_dose_livre, f.ativo, f.criado_em, f.atualizado_em FROM farmacos f JOIN farmacos_categorias fc ON fc.farmaco_id = f.id WHERE fc.categoria_chave = ? AND f.ativo = 1 ORDER BY f.nome ASC`;
    const [rows] = await fastify.mysql.query(sql, [categoria_chave]);
    return rows;
  }
};
