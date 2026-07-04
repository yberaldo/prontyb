'use strict'

// Repositório para tabela `fluidoterapias_prontuario`
module.exports = {
  async listarPorProntuarioId(fastify, prontuario_id) {
    const sql = `
      SELECT
        id, prontuario_id, fluido, taxa_ml_kg_h, desafio_hidrico_realizado, desafio_volume_ml_kg, desafio_tempo_min, desafio_quantidade, desafio_motivo, criado_em, atualizado_em
      FROM fluidoterapias_prontuario
      WHERE prontuario_id = ?
      ORDER BY id ASC
    `;
    const [rows] = await fastify.mysql.query(sql, [prontuario_id]);
    return rows;
  },

  async buscarPorId(fastify, id, prontuario_id = null) {
    const params = [id];
    let where = 'f.id = ?';
    if (prontuario_id !== null && typeof prontuario_id !== 'undefined') {
      where += ' AND f.prontuario_id = ?';
      params.push(prontuario_id);
    }
    const sql = `
      SELECT
        f.id, f.prontuario_id, f.fluido, f.taxa_ml_kg_h, f.desafio_hidrico_realizado, f.desafio_volume_ml_kg, f.desafio_tempo_min, f.desafio_quantidade, f.desafio_motivo, f.criado_em, f.atualizado_em
      FROM fluidoterapias_prontuario f
      WHERE ${where}
      LIMIT 1
    `;
    const [rows] = await fastify.mysql.query(sql, params);
    return rows && rows.length ? rows[0] : null;
  },

  async criar(fastify, dados = {}) {
    const allowed = ['prontuario_id','fluido','taxa_ml_kg_h','desafio_hidrico_realizado','desafio_volume_ml_kg','desafio_tempo_min','desafio_quantidade','desafio_motivo'];
    const campos = [];
    const params = [];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(dados, k)) {
        campos.push(k);
        params.push(dados[k]);
      }
    }

    const sql = `INSERT INTO fluidoterapias_prontuario (${campos.join(',')}) VALUES (${campos.map(()=>'?').join(',')})`;
    const [result] = await fastify.mysql.execute(sql, params);
    return result.insertId;
  },

  async atualizar(fastify, id, dados = {}) {
    const allowed = ['fluido','taxa_ml_kg_h','desafio_hidrico_realizado','desafio_volume_ml_kg','desafio_tempo_min','desafio_quantidade','desafio_motivo'];
    const campos = [];
    const params = [];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(dados, k)) {
        campos.push(`${k} = ?`);
        params.push(dados[k]);
      }
    }
    if (campos.length === 0) return 0;
    params.push(id);
    const sql = `UPDATE fluidoterapias_prontuario SET ${campos.join(', ')} WHERE id = ?`;
    const [result] = await fastify.mysql.execute(sql, params);
    return result.affectedRows;
  },

  async remover(fastify, id) {
    const sql = `DELETE FROM fluidoterapias_prontuario WHERE id = ?`;
    const [result] = await fastify.mysql.execute(sql, [id]);
    return result.affectedRows;
  }
};
