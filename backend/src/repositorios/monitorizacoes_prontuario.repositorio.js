'use strict'

// Repositorio para monitorizacoes extraidas do prontuario
module.exports = {
  async criarPendentePorAnexo(fastify, { prontuario_id, anexo_id }) {
    const sql = `
      INSERT INTO monitorizacoes_extraidas (prontuario_id, anexo_id, dados_json, colunas_json, status)
      VALUES (?, ?, NULL, NULL, 'pendente')
    `;
    const [result] = await fastify.mysql.execute(sql, [prontuario_id, anexo_id]);
    return result.insertId;
  },

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
  },

  async processarManualEstruturado(fastify, { prontuario_id, monitorizacao_extraida_id, colunas_json, dados_json, linhas }) {
    const conn = await fastify.mysql.getConnection();

    try {
      await conn.beginTransaction();

      const sqlBusca = `
        SELECT
          m.id, m.prontuario_id, m.anexo_id, m.status,
          a.tipo_anexo AS anexo_tipo_anexo
        FROM monitorizacoes_extraidas m
        INNER JOIN anexos_prontuario a ON a.id = m.anexo_id AND a.prontuario_id = m.prontuario_id
        WHERE m.id = ? AND m.prontuario_id = ?
        LIMIT 1
        FOR UPDATE
      `;
      const [rows] = await conn.query(sqlBusca, [monitorizacao_extraida_id, prontuario_id]);
      const monitorizacao = rows && rows.length ? rows[0] : null;

      if (!monitorizacao) {
        const err = new Error('monitorizacao nao encontrada');
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (monitorizacao.anexo_tipo_anexo !== 'pdf_monitorizacao') {
        const err = new Error('anexo da monitorizacao deve ser pdf_monitorizacao');
        err.code = 'BAD_REQUEST';
        throw err;
      }

      if (monitorizacao.status !== 'pendente') {
        const err = new Error('monitorizacao nao esta pendente');
        err.code = 'CONFLICT';
        throw err;
      }

      await conn.execute(
        'DELETE FROM monitorizacao_linhas WHERE prontuario_id = ? AND monitorizacao_extraida_id = ?',
        [prontuario_id, monitorizacao_extraida_id]
      );

      for (const linha of linhas) {
        await conn.execute(
          `
            INSERT INTO monitorizacao_linhas
              (prontuario_id, monitorizacao_extraida_id, horario, dados_json, ordem)
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            prontuario_id,
            monitorizacao_extraida_id,
            linha.horario,
            JSON.stringify(linha.dados_json),
            linha.ordem
          ]
        );
      }

      const [result] = await conn.execute(
        `
          UPDATE monitorizacoes_extraidas
          SET colunas_json = ?, dados_json = ?, status = 'extraido'
          WHERE id = ? AND prontuario_id = ? AND status = 'pendente'
        `,
        [
          JSON.stringify(colunas_json),
          dados_json === null ? null : JSON.stringify(dados_json),
          monitorizacao_extraida_id,
          prontuario_id
        ]
      );

      if (!result || result.affectedRows !== 1) {
        const err = new Error('monitorizacao nao esta pendente');
        err.code = 'CONFLICT';
        throw err;
      }

      await conn.commit();
      return {
        id: monitorizacao_extraida_id,
        prontuario_id,
        status: 'extraido',
        linhas_inseridas: linhas.length
      };
    } catch (err) {
      try { await conn.rollback(); } catch (_) {}
      throw err;
    } finally {
      conn.release();
    }
  }
};
