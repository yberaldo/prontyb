'use strict'

// Repositorio para a tabela profissionais
module.exports = {
  async listar(fastify, { busca = null, ativo = null, funcao = null } = {}) {
    const params = [];
    const where = [];

    if (busca) {
      const like = `%${busca}%`;
      where.push('(nome_completo LIKE ? OR crmv LIKE ? OR uf_crmv LIKE ?)');
      params.push(like, like, like);
    }

    if (ativo !== null && typeof ativo !== 'undefined') {
      where.push('ativo = ?');
      params.push(ativo ? 1 : 0);
    }

    if (funcao) {
      if (Array.isArray(funcao) && funcao.length > 0) {
        const marks = funcao.map(() => '?').join(',');
        where.push(`funcao IN (${marks})`);
        params.push(...funcao);
      } else if (typeof funcao === 'string') {
        where.push('funcao = ?');
        params.push(funcao);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT id, nome_completo, crmv, uf_crmv, funcao, ativo, criado_em, atualizado_em FROM profissionais ${whereSql} ORDER BY nome_completo ASC`;
    const [rows] = await fastify.mysql.query(sql, params);
    return rows;
  },

  async buscarPorId(fastify, id) {
    const sql = `SELECT id, nome_completo, crmv, uf_crmv, funcao, ativo, criado_em, atualizado_em FROM profissionais WHERE id = ? LIMIT 1`;
    const [rows] = await fastify.mysql.query(sql, [id]);
    return rows && rows.length ? rows[0] : null;
  },

  async criar(fastify, { nome_completo, crmv = null, uf_crmv = null, funcao, ativo = 1 }) {
    const sql = `INSERT INTO profissionais (nome_completo, crmv, uf_crmv, funcao, ativo) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await fastify.mysql.execute(sql, [nome_completo, crmv, uf_crmv, funcao, ativo ? 1 : 0]);
    return result.insertId;
  },

  async atualizar(fastify, id, dados = {}) {
    const campos = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(dados, 'nome_completo')) {
      campos.push('nome_completo = ?'); params.push(dados.nome_completo);
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'crmv')) {
      campos.push('crmv = ?'); params.push(dados.crmv);
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'uf_crmv')) {
      campos.push('uf_crmv = ?'); params.push(dados.uf_crmv);
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'funcao')) {
      campos.push('funcao = ?'); params.push(dados.funcao);
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'ativo')) {
      campos.push('ativo = ?'); params.push(dados.ativo ? 1 : 0);
    }

    if (campos.length === 0) return 0;

    const sql = `UPDATE profissionais SET ${campos.join(', ')} WHERE id = ?`;
    params.push(id);
    const [result] = await fastify.mysql.execute(sql, params);
    return result.affectedRows;
  },

  async definirAtivo(fastify, id, ativo) {
    const sql = `UPDATE profissionais SET ativo = ? WHERE id = ?`;
    const [result] = await fastify.mysql.execute(sql, [ativo ? 1 : 0, id]);
    return result.affectedRows;
  }
};
