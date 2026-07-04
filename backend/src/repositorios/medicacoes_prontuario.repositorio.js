'use strict'

// Repositório para tabela `medicacoes_prontuario`
module.exports = {
  async listarPorProntuarioId(fastify, prontuario_id) {
    const sql = `
      SELECT
        m.id, m.prontuario_id, m.categoria, m.subcategoria, m.farmaco_id, m.dose_selecionada, m.dose_digitada, m.unidade, m.motivo_uso, m.ordem, m.criado_em, m.atualizado_em,
        f.nome AS farmaco_nome, f.unidade_padrao AS farmaco_unidade_padrao, f.concentracao_padrao AS farmaco_concentracao_padrao, f.permite_dose_livre AS farmaco_permite_dose_livre, f.ativo AS farmaco_ativo
      FROM medicacoes_prontuario m
      LEFT JOIN farmacos f ON f.id = m.farmaco_id
      WHERE m.prontuario_id = ?
      ORDER BY m.categoria ASC, m.ordem ASC, m.id ASC
    `;
    const [rows] = await fastify.mysql.query(sql, [prontuario_id]);
    return rows;
  },

  async buscarPorId(fastify, id, prontuario_id = null) {
    const params = [id];
    let where = 'm.id = ?';
    if (prontuario_id !== null && typeof prontuario_id !== 'undefined') {
      where += ' AND m.prontuario_id = ?';
      params.push(prontuario_id);
    }
    const sql = `
      SELECT
        m.id, m.prontuario_id, m.categoria, m.subcategoria, m.farmaco_id, m.dose_selecionada, m.dose_digitada, m.unidade, m.motivo_uso, m.ordem, m.criado_em, m.atualizado_em,
        f.nome AS farmaco_nome, f.unidade_padrao AS farmaco_unidade_padrao, f.concentracao_padrao AS farmaco_concentracao_padrao, f.permite_dose_livre AS farmaco_permite_dose_livre, f.ativo AS farmaco_ativo
      FROM medicacoes_prontuario m
      LEFT JOIN farmacos f ON f.id = m.farmaco_id
      WHERE ${where}
      LIMIT 1
    `;
    const [rows] = await fastify.mysql.query(sql, params);
    return rows && rows.length ? rows[0] : null;
  },

  async criar(fastify, dados = {}) {
    const allowed = ['prontuario_id','categoria','subcategoria','farmaco_id','dose_selecionada','dose_digitada','unidade','motivo_uso','ordem'];
    const campos = [];
    const params = [];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(dados, k)) {
        campos.push(k);
        params.push(dados[k]);
      }
    }

    const sql = `INSERT INTO medicacoes_prontuario (${campos.join(',')}) VALUES (${campos.map(()=>'?').join(',')})`;
    const [result] = await fastify.mysql.execute(sql, params);
    return result.insertId;
  },

  async atualizar(fastify, id, dados = {}) {
    const allowed = ['categoria','subcategoria','farmaco_id','dose_selecionada','dose_digitada','unidade','motivo_uso','ordem'];
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
    const sql = `UPDATE medicacoes_prontuario SET ${campos.join(', ')} WHERE id = ?`;
    const [result] = await fastify.mysql.execute(sql, params);
    return result.affectedRows;
  },

  async remover(fastify, id) {
    const sql = `DELETE FROM medicacoes_prontuario WHERE id = ?`;
    const [result] = await fastify.mysql.execute(sql, [id]);
    return result.affectedRows;
  },

  async existeFarmacosCategoria(fastify, farmaco_id, categoria_chave) {
    const sql = `SELECT 1 FROM farmacos_categorias WHERE farmaco_id = ? AND categoria_chave = ? LIMIT 1`;
    const [rows] = await fastify.mysql.query(sql, [farmaco_id, categoria_chave]);
    return rows && rows.length > 0;
  }
};
