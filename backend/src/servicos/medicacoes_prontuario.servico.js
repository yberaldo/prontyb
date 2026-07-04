'use strict'

const repositorio = require('../repositorios/medicacoes_prontuario.repositorio');
const prontuariosRepo = require('../repositorios/prontuarios_anestesicos.repositorio');
const farmacosRepo = require('../repositorios/farmacos.repositorio');

function isPositiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

module.exports = {
  _serialize(reg) {
    if (!reg) return null;
    const item = {
      id: reg.id,
      prontuario_id: reg.prontuario_id,
      categoria: reg.categoria,
      subcategoria: reg.subcategoria,
      farmaco_id: reg.farmaco_id,
      dose_selecionada: reg.dose_selecionada,
      dose_digitada: reg.dose_digitada,
      unidade: reg.unidade,
      motivo_uso: reg.motivo_uso,
      ordem: reg.ordem,
      criado_em: reg.criado_em,
      atualizado_em: reg.atualizado_em
    };

    if (reg.farmaco_id) {
      item.farmaco = {
        id: reg.farmaco_id,
        nome: reg.farmaco_nome || null,
        unidade_padrao: reg.farmaco_unidade_padrao || null,
        concentracao_padrao: reg.farmaco_concentracao_padrao || null,
        permite_dose_livre: reg.farmaco_permite_dose_livre === undefined ? null : (reg.farmaco_permite_dose_livre ? 1 : 0),
        ativo: reg.farmaco_ativo === undefined ? null : (reg.farmaco_ativo ? 1 : 0)
      };
    } else {
      item.farmaco = null;
    }

    return item;
  },

  async listarPorProntuarioId(fastify, prontuario_id) {
    // validar existencia do prontuario antes de listar
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    const rows = await repositorio.listarPorProntuarioId(fastify, prontuario_id);
    return rows.map(r => module.exports._serialize(r));
  },

  async criar(fastify, prontuario_id, dados = {}) {
    // validar prontuario existe
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) {
      const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err;
    }

    if (!dados || Object.keys(dados).length === 0) { const err = new Error('body vazio'); err.code = 'BAD_REQUEST'; throw err; }

    // allowed fields
    const allowed = ['categoria','subcategoria','farmaco_id','dose_selecionada','dose_digitada','unidade','motivo_uso','ordem'];
    for (const k of Object.keys(dados)) {
      if (!allowed.includes(k)) { const err = new Error('campo desconhecido no body'); err.code = 'BAD_REQUEST'; throw err; }
    }

    // campos obrigatorios sem default na migration: categoria, subcategoria, farmaco_id
    const required = ['categoria','subcategoria','farmaco_id'];
    for (const f of required) {
      if (!Object.prototype.hasOwnProperty.call(dados, f) || dados[f] === null || dados[f] === undefined || (typeof dados[f] === 'string' && String(dados[f]).trim() === '')) {
        const err = new Error(`campo obrigatorio ausente: ${f}`); err.code = 'BAD_REQUEST'; throw err;
      }
    }

    // validar tipos básicos
    if (!isPositiveInt(Number(dados.farmaco_id))) { const err = new Error('farmaco_id invalido'); err.code = 'BAD_REQUEST'; throw err; }

    // validar existencia do farmaco
    const farmaco = await farmacosRepo.buscarPorId(fastify, Number(dados.farmaco_id));
    if (!farmaco) { const err = new Error('farmaco inexistente'); err.code = 'BAD_REQUEST'; throw err; }

    // validar FK composta farmaco_id + subcategoria <-> farmacos_categorias
    const okCombo = await repositorio.existeFarmacosCategoria(fastify, Number(dados.farmaco_id), dados.subcategoria);
    if (!okCombo) { const err = new Error('combinacao farmaco_id/subcategoria invalida'); err.code = 'BAD_REQUEST'; throw err; }

    // montar dados a inserir
    const toInsert = Object.assign({}, dados, { prontuario_id: prontuario_id });
    try {
      const insertId = await repositorio.criar(fastify, toInsert);
      const row = await repositorio.buscarPorId(fastify, insertId);
      return module.exports._serialize(row);
    } catch (err) {
      throw err;
    }
  },

  async atualizar(fastify, prontuario_id, medicacao_id, dados = {}) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    if (!isPositiveInt(Number(medicacao_id))) { const err = new Error('medicacao_id invalido'); err.code = 'BAD_REQUEST'; throw err; }

    const existente = await repositorio.buscarPorId(fastify, Number(medicacao_id));
    if (!existente) { const err = new Error('medicacao nao encontrada'); err.code = 'NOT_FOUND'; throw err; }
    if (existente.prontuario_id !== Number(prontuario_id)) { const err = new Error('medicacao nao pertence ao prontuario'); err.code = 'NOT_FOUND'; throw err; }

    if (!dados || Object.keys(dados).length === 0) { const err = new Error('body vazio'); err.code = 'BAD_REQUEST'; throw err; }

    if (Object.prototype.hasOwnProperty.call(dados, 'id') || Object.prototype.hasOwnProperty.call(dados, 'prontuario_id') || Object.prototype.hasOwnProperty.call(dados, 'criado_em')) {
      const err = new Error('campo proibido no body'); err.code = 'BAD_REQUEST'; throw err;
    }

    const allowed = ['categoria','subcategoria','farmaco_id','dose_selecionada','dose_digitada','unidade','motivo_uso','ordem'];
    for (const k of Object.keys(dados)) {
      if (!allowed.includes(k)) { const err = new Error('campo desconhecido no body'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'farmaco_id')) {
      if (!isPositiveInt(Number(dados.farmaco_id))) { const err = new Error('farmaco_id invalido'); err.code = 'BAD_REQUEST'; throw err; }
      const farmaco = await farmacosRepo.buscarPorId(fastify, Number(dados.farmaco_id));
      if (!farmaco) { const err = new Error('farmaco inexistente'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'subcategoria') || Object.prototype.hasOwnProperty.call(dados, 'farmaco_id')) {
      const farmaco_id_to_check = Object.prototype.hasOwnProperty.call(dados, 'farmaco_id') ? Number(dados.farmaco_id) : existente.farmaco_id;
      const subcategoria_to_check = Object.prototype.hasOwnProperty.call(dados, 'subcategoria') ? dados.subcategoria : existente.subcategoria;
      const okCombo = await repositorio.existeFarmacosCategoria(fastify, farmaco_id_to_check, subcategoria_to_check);
      if (!okCombo) { const err = new Error('combinacao farmaco_id/subcategoria invalida'); err.code = 'BAD_REQUEST'; throw err; }
    }

    const affected = await repositorio.atualizar(fastify, Number(medicacao_id), dados);
    if (affected === 0) { const err = new Error('medicacao nao encontrada'); err.code = 'NOT_FOUND'; throw err; }
    const row = await repositorio.buscarPorId(fastify, Number(medicacao_id));
    return module.exports._serialize(row);
  },

  async remover(fastify, prontuario_id, medicacao_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    const existente = await repositorio.buscarPorId(fastify, Number(medicacao_id));
    if (!existente || existente.prontuario_id !== Number(prontuario_id)) { const err = new Error('medicacao nao encontrada'); err.code = 'NOT_FOUND'; throw err; }

    const affected = await repositorio.remover(fastify, Number(medicacao_id));
    return affected > 0;
  }
};
