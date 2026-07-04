'use strict'

// Repositório para tabela `anexos_prontuario`
module.exports = {
  async listarPorProntuarioId(fastify, prontuario_id) {
    const sql = `
      SELECT id, prontuario_id, tipo_anexo, nome_arquivo, caminho_arquivo, mime_type, tamanho_bytes, criado_em
      FROM anexos_prontuario
      WHERE prontuario_id = ?
      ORDER BY id ASC
    `;
    const [rows] = await fastify.mysql.query(sql, [prontuario_id]);
    return rows;
  },

  async buscarPorId(fastify, id, prontuario_id = null) {
    const params = [id];
    let where = 'a.id = ?';
    if (prontuario_id !== null && typeof prontuario_id !== 'undefined') {
      where += ' AND a.prontuario_id = ?';
      params.push(prontuario_id);
    }
    const sql = `
      SELECT id, prontuario_id, tipo_anexo, nome_arquivo, caminho_arquivo, mime_type, tamanho_bytes, criado_em
      FROM anexos_prontuario a
      WHERE ${where}
      LIMIT 1
    `;
    const [rows] = await fastify.mysql.query(sql, params);
    return rows && rows.length ? rows[0] : null;
  },

  async criar(fastify, dados = {}) {
    const allowed = ['prontuario_id','tipo_anexo','nome_arquivo','caminho_arquivo','mime_type','tamanho_bytes'];
    const campos = [];
    const params = [];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(dados, k)) {
        campos.push(k);
        params.push(dados[k]);
      }
    }

    const sql = `INSERT INTO anexos_prontuario (${campos.join(',')}) VALUES (${campos.map(()=>'?').join(',')})`;
    const [result] = await fastify.mysql.execute(sql, params);
    return result.insertId;
  },

  async remover(fastify, id) {
    const sql = `DELETE FROM anexos_prontuario WHERE id = ?`;
    const [result] = await fastify.mysql.execute(sql, [id]);
    return result.affectedRows;
  }
};
