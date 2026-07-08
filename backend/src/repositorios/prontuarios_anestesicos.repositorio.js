'use strict'

// Repositório read-only / write básico para tabela `prontuarios_anestesicos`
module.exports = {
  async listar(fastify, { busca = null, clinica_id = null, anestesista_id = null, cirurgiao_id = null, data_inicio = null, data_fim = null } = {}) {
    const params = [];
    const where = [];

    if (busca) {
      const like = `%${busca}%`;
      where.push('(p.nome_animal LIKE ? OR p.nome_tutor LIKE ? OR p.nome_procedimento LIKE ? OR p.especie LIKE ? OR p.raca LIKE ?)');
      params.push(like, like, like, like, like);
    }

    if (clinica_id !== null && typeof clinica_id !== 'undefined') {
      where.push('p.clinica_id = ?'); params.push(clinica_id);
    }

    if (anestesista_id !== null && typeof anestesista_id !== 'undefined') {
      where.push('p.anestesista_id = ?'); params.push(anestesista_id);
    }

    if (cirurgiao_id !== null && typeof cirurgiao_id !== 'undefined') {
      where.push('p.cirurgiao_id = ?'); params.push(cirurgiao_id);
    }

    if (data_inicio) {
      where.push('p.data_procedimento >= ?'); params.push(data_inicio);
    }
    if (data_fim) {
      where.push('p.data_procedimento <= ?'); params.push(data_fim);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Selecionar apenas colunas existentes na migration e campos basicos vinculados
    const sql = `
      SELECT
        p.id, p.numero_prontuario, p.clinica_id, p.nome_animal, p.especie, p.raca, p.sexo, p.idade, p.peso, p.nome_tutor,
        p.nome_procedimento, p.data_procedimento, p.cirurgiao_id, p.anestesista_id, p.observacoes_pre_anestesicas, p.criado_em, p.atualizado_em,
        c.nome AS clinica_nome,
        a.nome_completo AS anestesista_nome, a.crmv AS anestesista_crmv, a.uf_crmv AS anestesista_uf,
        cr.nome_completo AS cirurgiao_nome, cr.crmv AS cirurgiao_crmv, cr.uf_crmv AS cirurgiao_uf
      FROM prontuarios_anestesicos p
      LEFT JOIN clinicas c ON p.clinica_id = c.id
      LEFT JOIN profissionais a ON p.anestesista_id = a.id
      LEFT JOIN profissionais cr ON p.cirurgiao_id = cr.id
      ${whereSql}
      ORDER BY p.data_procedimento DESC, p.id DESC
    `;

    const [rows] = await fastify.mysql.query(sql, params);
    return rows;
  },

  async buscarPorId(fastify, id) {
    const sql = `
      SELECT
        p.id, p.numero_prontuario, p.clinica_id, p.nome_animal, p.especie, p.raca, p.sexo, p.idade, p.peso, p.nome_tutor,
        p.nome_procedimento, p.data_procedimento, p.cirurgiao_id, p.anestesista_id, p.observacoes_pre_anestesicas, p.criado_em, p.atualizado_em,
        c.nome AS clinica_nome,
        a.nome_completo AS anestesista_nome, a.crmv AS anestesista_crmv, a.uf_crmv AS anestesista_uf,
        cr.nome_completo AS cirurgiao_nome, cr.crmv AS cirurgiao_crmv, cr.uf_crmv AS cirurgiao_uf
      FROM prontuarios_anestesicos p
      LEFT JOIN clinicas c ON p.clinica_id = c.id
      LEFT JOIN profissionais a ON p.anestesista_id = a.id
      LEFT JOIN profissionais cr ON p.cirurgiao_id = cr.id
      WHERE p.id = ?
      LIMIT 1
    `;
    const [rows] = await fastify.mysql.query(sql, [id]);
    return rows && rows.length ? rows[0] : null;
  },

  async criar(fastify, dados = {}) {
    const campos = [];
    const params = [];

    const allowed = ['numero_prontuario','clinica_id','nome_animal','especie','raca','sexo','idade','peso','nome_tutor','nome_procedimento','data_procedimento','cirurgiao_id','anestesista_id','observacoes_pre_anestesicas'];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(dados, k)) {
        campos.push(k);
        params.push(dados[k]);
      }
    }

    const sql = `INSERT INTO prontuarios_anestesicos (${campos.join(',')}) VALUES (${campos.map(()=>'?').join(',')})`;
    const [result] = await fastify.mysql.execute(sql, params);
    return result.insertId;
  },

  async atualizar(fastify, id, dados = {}) {
    const campos = [];
    const params = [];
    const allowed = ['numero_prontuario','clinica_id','nome_animal','especie','raca','sexo','idade','peso','nome_tutor','nome_procedimento','data_procedimento','cirurgiao_id','anestesista_id','observacoes_pre_anestesicas'];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(dados, k)) {
        campos.push(`${k} = ?`);
        params.push(dados[k]);
      }
    }

    if (campos.length === 0) return 0;
    params.push(id);
    const sql = `UPDATE prontuarios_anestesicos SET ${campos.join(', ')} WHERE id = ?`;
    const [result] = await fastify.mysql.execute(sql, params);
    return result.affectedRows;
  }
};
