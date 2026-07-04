'use strict'

const repositorio = require('../repositorios/prontuarios_anestesicos.repositorio');

function isPositiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

module.exports = {
  async listar(fastify, filtros) {
    return repositorio.listar(fastify, filtros);
  },

  async obterPorId(fastify, id) {
    return repositorio.buscarPorId(fastify, id);
  },

  async criar(fastify, dados) {
    // validar campos obrigatorios conforme migration
    const required = ['numero_prontuario','nome_animal','especie','nome_tutor','nome_procedimento','data_procedimento','anestesista_id'];
    for (const f of required) {
      if (!Object.prototype.hasOwnProperty.call(dados, f) || dados[f] === null || dados[f] === undefined || (typeof dados[f] === 'string' && dados[f].trim() === '')) {
        const err = new Error(`campo obrigatorio ausente: ${f}`);
        err.code = 'BAD_REQUEST';
        throw err;
      }
    }

    // validar tipos basicos
    if (!isPositiveInt(Number(dados.anestesista_id))) {
      const err = new Error('anestesista_id invalido'); err.code = 'BAD_REQUEST'; throw err;
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'clinica_id') && dados.clinica_id !== null && dados.clinica_id !== undefined) {
      if (!isPositiveInt(Number(dados.clinica_id))) { const err = new Error('clinica_id invalido'); err.code = 'BAD_REQUEST'; throw err; }
      const [rows] = await fastify.mysql.query('SELECT id FROM clinicas WHERE id = ? LIMIT 1', [dados.clinica_id]);
      if (!rows || rows.length === 0) { const err = new Error('clinica inexistente'); err.code = 'BAD_REQUEST'; throw err; }
    }

    // validar anestesista existe
    const [aRows] = await fastify.mysql.query('SELECT id FROM profissionais WHERE id = ? LIMIT 1', [dados.anestesista_id]);
    if (!aRows || aRows.length === 0) { const err = new Error('anestesista inexistente'); err.code = 'BAD_REQUEST'; throw err; }

    if (Object.prototype.hasOwnProperty.call(dados, 'cirurgiao_id') && dados.cirurgiao_id !== null && dados.cirurgiao_id !== undefined) {
      if (!isPositiveInt(Number(dados.cirurgiao_id))) { const err = new Error('cirurgiao_id invalido'); err.code = 'BAD_REQUEST'; throw err; }
      const [cRows] = await fastify.mysql.query('SELECT id FROM profissionais WHERE id = ? LIMIT 1', [dados.cirurgiao_id]);
      if (!cRows || cRows.length === 0) { const err = new Error('cirurgiao inexistente'); err.code = 'BAD_REQUEST'; throw err; }
    }

    try {
      const insertId = await repositorio.criar(fastify, dados);
      return repositorio.buscarPorId(fastify, insertId);
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        const e = new Error('numero_prontuario_duplicado'); e.code = 'DUPLICATE'; throw e;
      }
      throw err;
    }
  },

  async atualizar(fastify, id, dados) {
    // nao permitir campos proibidos
    if (!dados || Object.keys(dados).length === 0) {
      const err = new Error('body vazio'); err.code = 'BAD_REQUEST'; throw err;
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'id')) {
      const err = new Error('nao é permitido alterar id'); err.code = 'BAD_REQUEST'; throw err;
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'criado_em')) {
      const err = new Error('nao é permitido alterar criado_em'); err.code = 'BAD_REQUEST'; throw err;
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'anestesista_id')) {
      if (!isPositiveInt(Number(dados.anestesista_id))) { const err = new Error('anestesista_id invalido'); err.code = 'BAD_REQUEST'; throw err; }
      const [aRows] = await fastify.mysql.query('SELECT id FROM profissionais WHERE id = ? LIMIT 1', [dados.anestesista_id]);
      if (!aRows || aRows.length === 0) { const err = new Error('anestesista inexistente'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'clinica_id')) {
      if (dados.clinica_id !== null && dados.clinica_id !== undefined && !isPositiveInt(Number(dados.clinica_id))) { const err = new Error('clinica_id invalido'); err.code = 'BAD_REQUEST'; throw err; }
      if (dados.clinica_id !== null && dados.clinica_id !== undefined) {
        const [rows] = await fastify.mysql.query('SELECT id FROM clinicas WHERE id = ? LIMIT 1', [dados.clinica_id]);
        if (!rows || rows.length === 0) { const err = new Error('clinica inexistente'); err.code = 'BAD_REQUEST'; throw err; }
      }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'cirurgiao_id')) {
      if (dados.cirurgiao_id !== null && dados.cirurgiao_id !== undefined && !isPositiveInt(Number(dados.cirurgiao_id))) { const err = new Error('cirurgiao_id invalido'); err.code = 'BAD_REQUEST'; throw err; }
      if (dados.cirurgiao_id !== null && dados.cirurgiao_id !== undefined) {
        const [cRows] = await fastify.mysql.query('SELECT id FROM profissionais WHERE id = ? LIMIT 1', [dados.cirurgiao_id]);
        if (!cRows || cRows.length === 0) { const err = new Error('cirurgiao inexistente'); err.code = 'BAD_REQUEST'; throw err; }
      }
    }

    const affected = await repositorio.atualizar(fastify, id, dados);
    if (affected === 0) return null;
    return repositorio.buscarPorId(fastify, id);
  }
};
