'use strict'

// Repositorio responsavel por executar SQL na tabela clinicas
module.exports = {
  // listar clinicas com filtros opcionais
  async listar(fastify, { busca = null, ativo = null } = {}) {
    const params = [];
    const where = [];

    if (busca) {
      const like = `%${busca}%`;
      where.push('(nome LIKE ? OR cidade LIKE ? OR estado LIKE ?)');
      params.push(like, like, like);
    }

    if (ativo !== null && typeof ativo !== 'undefined') {
      // garantir 1 ou 0
      where.push('ativo = ?');
      params.push(ativo ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT id, nome, endereco, cidade, estado, ativo, criado_em, atualizado_em FROM clinicas ${whereSql} ORDER BY nome ASC`;
    const [rows] = await fastify.mysql.query(sql, params);
    return rows;
  },

  // buscar clinica por id
  async buscarPorId(fastify, id) {
    const sql = `SELECT id, nome, endereco, cidade, estado, ativo, criado_em, atualizado_em FROM clinicas WHERE id = ? LIMIT 1`;
    const [rows] = await fastify.mysql.query(sql, [id]);
    return rows && rows.length ? rows[0] : null;
  },

  // criar clinica: retorna insertId
  async criar(fastify, { nome, endereco = null, cidade = null, estado = null, ativo = 1 }) {
    const sql = `INSERT INTO clinicas (nome, endereco, cidade, estado, ativo) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await fastify.mysql.execute(sql, [nome, endereco, cidade, estado, ativo ? 1 : 0]);
    return result.insertId;
  },

  // atualizar campos especificados
  async atualizar(fastify, id, dados = {}) {
    const campos = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(dados, 'nome')) {
      campos.push('nome = ?'); params.push(dados.nome);
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'endereco')) {
      campos.push('endereco = ?'); params.push(dados.endereco);
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'cidade')) {
      campos.push('cidade = ?'); params.push(dados.cidade);
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'estado')) {
      campos.push('estado = ?'); params.push(dados.estado);
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'ativo')) {
      campos.push('ativo = ?'); params.push(dados.ativo ? 1 : 0);
    }

    if (campos.length === 0) {
      return 0; // nada a atualizar
    }

    const sql = `UPDATE clinicas SET ${campos.join(', ')} WHERE id = ?`;
    params.push(id);
    const [result] = await fastify.mysql.execute(sql, params);
    return result.affectedRows;
  },

  // definir ativo 1 ou 0
  async definirAtivo(fastify, id, ativo) {
    const sql = `UPDATE clinicas SET ativo = ? WHERE id = ?`;
    const [result] = await fastify.mysql.execute(sql, [ativo ? 1 : 0, id]);
    return result.affectedRows;
  }
};
