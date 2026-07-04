'use strict'

// Repositorio somente leitura para monitorizacoes extraidas do prontuario
module.exports = {
  async listarPorProntuarioId(fastify, prontuario_id, { status = null } = {}) {
    const params = [prontuario_id];
    let whereStatus = '';

    if (status !== null && typeof status !== 'undefined') {
      whereStatus = ' AND m.status = ?';
      params.push(status);
    }

    const sql = `
      SELECT
        m.id, m.prontuario_id, m.anexo_id, m.dados_json, m.colunas_json, m.status, m.criado_em, m.atualizado_em,
        a.id AS anexo_id_join,
        a.tipo_anexo AS anexo_tipo_anexo,
        a.nome_arquivo AS anexo_nome_arquivo,
        a.caminho_arquivo AS anexo_caminho_arquivo,
        a.mime_type AS anexo_mime_type,
        a.tamanho_bytes AS anexo_tamanho_bytes
      FROM monitorizacoes_extraidas m
      INNER JOIN anexos_prontuario a ON a.id = m.anexo_id AND a.prontuario_id = m.prontuario_id
      WHERE m.prontuario_id = ?${whereStatus}
      ORDER BY m.criado_em DESC, m.id DESC
    `;
    const [rows] = await fastify.mysql.query(sql, params);
    return rows;
  },

  async buscarPorId(fastify, id, prontuario_id) {
    const sql = `
      SELECT
        m.id, m.prontuario_id, m.anexo_id, m.dados_json, m.colunas_json, m.status, m.criado_em, m.atualizado_em,
        a.id AS anexo_id_join,
        a.tipo_anexo AS anexo_tipo_anexo,
        a.nome_arquivo AS anexo_nome_arquivo,
        a.caminho_arquivo AS anexo_caminho_arquivo,
        a.mime_type AS anexo_mime_type,
        a.tamanho_bytes AS anexo_tamanho_bytes
      FROM monitorizacoes_extraidas m
      INNER JOIN anexos_prontuario a ON a.id = m.anexo_id AND a.prontuario_id = m.prontuario_id
      WHERE m.id = ? AND m.prontuario_id = ?
      LIMIT 1
    `;
    const [rows] = await fastify.mysql.query(sql, [id, prontuario_id]);
    return rows && rows.length ? rows[0] : null;
  },

  async listarLinhasPorMonitorizacaoId(fastify, prontuario_id, monitorizacao_extraida_id) {
    const sql = `
      SELECT id, prontuario_id, monitorizacao_extraida_id, horario, dados_json, ordem
      FROM monitorizacao_linhas
      WHERE prontuario_id = ? AND monitorizacao_extraida_id = ?
      ORDER BY ordem ASC, id ASC
    `;
    const [rows] = await fastify.mysql.query(sql, [prontuario_id, monitorizacao_extraida_id]);
    return rows;
  }
};
