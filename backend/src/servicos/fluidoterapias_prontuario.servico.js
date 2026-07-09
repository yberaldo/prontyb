'use strict'

const repositorio = require('../repositorios/fluidoterapias_prontuario.repositorio');
const prontuariosRepo = require('../repositorios/prontuarios_anestesicos.repositorio');

function isPositiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

const FLUIDOS = ['ringer_com_lactato','solucao_fisiologica_09'];
const CATETERES = ['24_amarelo','22_azul','20_rosa'];
const MEMBROS_CANULADOS = [
  'membro_anterior_esquerdo',
  'membro_anterior_direito',
  'membro_posterior_direito',
  'membro_posterior_esquerdo',
];

function normalizeOptionalChoice(dados, field, allowed, errorMessage) {
  if (!Object.prototype.hasOwnProperty.call(dados, field)) return;

  const valor = dados[field];
  if (valor === null || typeof valor === 'undefined' || String(valor).trim() === '') {
    dados[field] = null;
    return;
  }

  if (typeof valor !== 'string' || !allowed.includes(valor)) {
    const err = new Error(errorMessage);
    err.code = 'BAD_REQUEST';
    throw err;
  }
}

module.exports = {
  _serialize(reg) {
    if (!reg) return null;
    return {
      id: reg.id,
      prontuario_id: reg.prontuario_id,
      fluido: reg.fluido,
      cateter_utilizado: reg.cateter_utilizado,
      membro_canulado: reg.membro_canulado,
      taxa_ml_kg_h: reg.taxa_ml_kg_h === null ? null : Number(reg.taxa_ml_kg_h),
      desafio_hidrico_realizado: reg.desafio_hidrico_realizado ? 1 : 0,
      desafio_volume_ml_kg: reg.desafio_volume_ml_kg === null ? null : Number(reg.desafio_volume_ml_kg),
      desafio_tempo_min: reg.desafio_tempo_min,
      desafio_quantidade: reg.desafio_quantidade,
      desafio_motivo: reg.desafio_motivo,
      criado_em: reg.criado_em,
      atualizado_em: reg.atualizado_em
    };
  },

  async listarPorProntuarioId(fastify, prontuario_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    const rows = await repositorio.listarPorProntuarioId(fastify, prontuario_id);
    return rows.map(r => module.exports._serialize(r));
  },

  async criar(fastify, prontuario_id, dados = {}) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    if (!dados || Object.keys(dados).length === 0) { const err = new Error('body vazio'); err.code = 'BAD_REQUEST'; throw err; }

    const allowed = ['fluido','cateter_utilizado','membro_canulado','taxa_ml_kg_h','desafio_hidrico_realizado','desafio_volume_ml_kg','desafio_tempo_min','desafio_quantidade','desafio_motivo'];
    for (const k of Object.keys(dados)) {
      if (!allowed.includes(k)) { const err = new Error('campo desconhecido no body'); err.code = 'BAD_REQUEST'; throw err; }
    }

    // campos obrigatorios sem default na migration: fluido
    if (!Object.prototype.hasOwnProperty.call(dados, 'fluido') || String(dados.fluido).trim() === '') {
      const err = new Error('campo obrigatorio ausente: fluido'); err.code = 'BAD_REQUEST'; throw err;
    }

    // validar fluido
    if (!FLUIDOS.includes(dados.fluido)) { const err = new Error('fluido invalido'); err.code = 'BAD_REQUEST'; throw err; }

    normalizeOptionalChoice(dados, 'cateter_utilizado', CATETERES, 'cateter_utilizado invalido');
    normalizeOptionalChoice(dados, 'membro_canulado', MEMBROS_CANULADOS, 'membro_canulado invalido');

    // validar numeros quando presentes
    if (Object.prototype.hasOwnProperty.call(dados, 'taxa_ml_kg_h')) {
      const v = Number(dados.taxa_ml_kg_h);
      if (Number.isNaN(v) || v < 0) { const err = new Error('taxa_ml_kg_h invalido'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_volume_ml_kg')) {
      const v = Number(dados.desafio_volume_ml_kg);
      if (Number.isNaN(v) || v < 0) { const err = new Error('desafio_volume_ml_kg invalido'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_tempo_min')) {
      const v = Number(dados.desafio_tempo_min);
      if (!isPositiveInt(Number(v))) { const err = new Error('desafio_tempo_min invalido'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_quantidade')) {
      const v = Number(dados.desafio_quantidade);
      if (!Number.isInteger(v) || v < 0) { const err = new Error('desafio_quantidade invalido'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_hidrico_realizado')) {
      const val = dados.desafio_hidrico_realizado;
      if (!(val === 0 || val === 1 || val === '0' || val === '1' || typeof val === 'boolean')) {
        const err = new Error('desafio_hidrico_realizado invalido'); err.code = 'BAD_REQUEST'; throw err;
      }
      // normalize to 0/1 integer
      dados.desafio_hidrico_realizado = (val === true || val === '1' || val === 1) ? 1 : 0;
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_motivo')) {
      if (typeof dados.desafio_motivo !== 'string') { const err = new Error('desafio_motivo invalido'); err.code = 'BAD_REQUEST'; throw err; }
      if (dados.desafio_motivo.length > 150) { const err = new Error('desafio_motivo muito longo'); err.code = 'BAD_REQUEST'; throw err; }
    }

    const toInsert = Object.assign({}, dados, { prontuario_id: prontuario_id });
    const insertId = await repositorio.criar(fastify, toInsert);
    const row = await repositorio.buscarPorId(fastify, insertId);
    return module.exports._serialize(row);
  },

  async atualizar(fastify, prontuario_id, fluidoterapia_id, dados = {}) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    if (!isPositiveInt(Number(fluidoterapia_id))) { const err = new Error('fluidoterapia_id invalido'); err.code = 'BAD_REQUEST'; throw err; }

    const existente = await repositorio.buscarPorId(fastify, Number(fluidoterapia_id));
    if (!existente) { const err = new Error('fluidoterapia nao encontrada'); err.code = 'NOT_FOUND'; throw err; }
    if (existente.prontuario_id !== Number(prontuario_id)) { const err = new Error('fluidoterapia nao pertence ao prontuario'); err.code = 'NOT_FOUND'; throw err; }

    if (!dados || Object.keys(dados).length === 0) { const err = new Error('body vazio'); err.code = 'BAD_REQUEST'; throw err; }

    if (Object.prototype.hasOwnProperty.call(dados, 'id') || Object.prototype.hasOwnProperty.call(dados, 'prontuario_id') || Object.prototype.hasOwnProperty.call(dados, 'criado_em')) {
      const err = new Error('campo proibido no body'); err.code = 'BAD_REQUEST'; throw err;
    }

    const allowed = ['fluido','cateter_utilizado','membro_canulado','taxa_ml_kg_h','desafio_hidrico_realizado','desafio_volume_ml_kg','desafio_tempo_min','desafio_quantidade','desafio_motivo'];
    for (const k of Object.keys(dados)) {
      if (!allowed.includes(k)) { const err = new Error('campo desconhecido no body'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'fluido')) {
      if (!FLUIDOS.includes(dados.fluido)) { const err = new Error('fluido invalido'); err.code = 'BAD_REQUEST'; throw err; }
    }

    normalizeOptionalChoice(dados, 'cateter_utilizado', CATETERES, 'cateter_utilizado invalido');
    normalizeOptionalChoice(dados, 'membro_canulado', MEMBROS_CANULADOS, 'membro_canulado invalido');

    if (Object.prototype.hasOwnProperty.call(dados, 'taxa_ml_kg_h')) {
      const v = Number(dados.taxa_ml_kg_h);
      if (Number.isNaN(v) || v < 0) { const err = new Error('taxa_ml_kg_h invalido'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_volume_ml_kg')) {
      const v = Number(dados.desafio_volume_ml_kg);
      if (Number.isNaN(v) || v < 0) { const err = new Error('desafio_volume_ml_kg invalido'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_tempo_min')) {
      const v = Number(dados.desafio_tempo_min);
      if (!isPositiveInt(Number(v))) { const err = new Error('desafio_tempo_min invalido'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_quantidade')) {
      const v = Number(dados.desafio_quantidade);
      if (!Number.isInteger(v) || v < 0) { const err = new Error('desafio_quantidade invalido'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_hidrico_realizado')) {
      const val = dados.desafio_hidrico_realizado;
      if (!(val === 0 || val === 1 || val === '0' || val === '1' || typeof val === 'boolean')) {
        const err = new Error('desafio_hidrico_realizado invalido'); err.code = 'BAD_REQUEST'; throw err;
      }
      dados.desafio_hidrico_realizado = (val === true || val === '1' || val === 1) ? 1 : 0;
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'desafio_motivo')) {
      if (typeof dados.desafio_motivo !== 'string') { const err = new Error('desafio_motivo invalido'); err.code = 'BAD_REQUEST'; throw err; }
      if (dados.desafio_motivo.length > 150) { const err = new Error('desafio_motivo muito longo'); err.code = 'BAD_REQUEST'; throw err; }
    }

    const affected = await repositorio.atualizar(fastify, Number(fluidoterapia_id), dados);
    if (affected === 0) { const err = new Error('fluidoterapia nao encontrada'); err.code = 'NOT_FOUND'; throw err; }
    const row = await repositorio.buscarPorId(fastify, Number(fluidoterapia_id));
    return module.exports._serialize(row);
  },

  async remover(fastify, prontuario_id, fluidoterapia_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    const existente = await repositorio.buscarPorId(fastify, Number(fluidoterapia_id));
    if (!existente || existente.prontuario_id !== Number(prontuario_id)) { const err = new Error('fluidoterapia nao encontrada'); err.code = 'NOT_FOUND'; throw err; }

    const affected = await repositorio.remover(fastify, Number(fluidoterapia_id));
    return affected > 0;
  }
};
