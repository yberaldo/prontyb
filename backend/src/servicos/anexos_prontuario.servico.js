'use strict'

const repositorio = require('../repositorios/anexos_prontuario.repositorio');
const prontuariosRepo = require('../repositorios/prontuarios_anestesicos.repositorio');

function isPositiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

function hasPathTraversal(v) {
  if (!v || typeof v !== 'string') return false;
  if (v.indexOf('../') !== -1) return true;
  if (v.indexOf('..\\') !== -1) return true;
  if (v.startsWith('/')) return true;
  if (/^[A-Za-z]:\\/.test(v)) return true;
  return false;
}

module.exports = {
  _serialize(reg) {
    if (!reg) return null;
    return {
      id: reg.id,
      prontuario_id: reg.prontuario_id,
      tipo_anexo: reg.tipo_anexo,
      nome_arquivo: reg.nome_arquivo,
      caminho_arquivo: reg.caminho_arquivo,
      mime_type: reg.mime_type,
      tamanho_bytes: Number(reg.tamanho_bytes),
      criado_em: reg.criado_em
    };
  },

  async listarPorProntuarioId(fastify, prontuario_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    const rows = await repositorio.listarPorProntuarioId(fastify, prontuario_id);
    return rows.map(r => module.exports._serialize(r));
  },

  async buscarPorId(fastify, prontuario_id, anexo_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    const reg = await repositorio.buscarPorId(fastify, Number(anexo_id));
    if (!reg || reg.prontuario_id !== Number(prontuario_id)) { const err = new Error('anexo nao encontrado'); err.code = 'NOT_FOUND'; throw err; }
    return module.exports._serialize(reg);
  },

  async criar(fastify, prontuario_id, dados = {}) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    if (!dados || Object.keys(dados).length === 0) { const err = new Error('body vazio'); err.code = 'BAD_REQUEST'; throw err; }

    // proibir campos nao permitidos
    if (Object.prototype.hasOwnProperty.call(dados, 'id') || Object.prototype.hasOwnProperty.call(dados, 'prontuario_id') || Object.prototype.hasOwnProperty.call(dados, 'criado_em')) {
      const err = new Error('campo proibido no body'); err.code = 'BAD_REQUEST'; throw err;
    }

    const allowed = ['tipo_anexo','nome_arquivo','caminho_arquivo','mime_type','tamanho_bytes'];
    for (const k of Object.keys(dados)) {
      if (!allowed.includes(k)) { const err = new Error('campo desconhecido no body'); err.code = 'BAD_REQUEST'; throw err; }
    }

    // validar obrigatorios
    const required = ['tipo_anexo','nome_arquivo','caminho_arquivo','mime_type','tamanho_bytes'];
    for (const f of required) {
      if (!Object.prototype.hasOwnProperty.call(dados, f) || dados[f] === null || dados[f] === undefined || (typeof dados[f] === 'string' && String(dados[f]).trim() === '')) {
        const err = new Error(`campo obrigatorio ausente: ${f}`); err.code = 'BAD_REQUEST'; throw err;
      }
    }

    // validar tipo_anexo
    const tipos = ['pdf_monitorizacao','pdf_prontuario_final','outro'];
    if (!tipos.includes(dados.tipo_anexo)) { const err = new Error('tipo_anexo invalido'); err.code = 'BAD_REQUEST'; throw err; }

    // validar tamanho dos campos string
    if (typeof dados.nome_arquivo !== 'string' || dados.nome_arquivo.length === 0 || dados.nome_arquivo.length > 255) { const err = new Error('nome_arquivo invalido'); err.code = 'BAD_REQUEST'; throw err; }
    if (typeof dados.caminho_arquivo !== 'string' || dados.caminho_arquivo.length === 0 || dados.caminho_arquivo.length > 255) { const err = new Error('caminho_arquivo invalido'); err.code = 'BAD_REQUEST'; throw err; }
    if (typeof dados.mime_type !== 'string' || dados.mime_type.length === 0 || dados.mime_type.length > 100) { const err = new Error('mime_type invalido'); err.code = 'BAD_REQUEST'; throw err; }

    // validar tamanho_bytes
    const t = Number(dados.tamanho_bytes);
    if (!Number.isInteger(t) || t < 0) { const err = new Error('tamanho_bytes invalido'); err.code = 'BAD_REQUEST'; throw err; }

    // proteger contra path traversal
    if (hasPathTraversal(dados.caminho_arquivo)) { const err = new Error('caminho_arquivo invalido'); err.code = 'BAD_REQUEST'; throw err; }

    // montar e inserir
    const toInsert = {
      prontuario_id: prontuario_id,
      tipo_anexo: dados.tipo_anexo,
      nome_arquivo: dados.nome_arquivo,
      caminho_arquivo: dados.caminho_arquivo,
      mime_type: dados.mime_type,
      tamanho_bytes: t
    };

    try {
      const insertId = await repositorio.criar(fastify, toInsert);
      const row = await repositorio.buscarPorId(fastify, insertId);
      return module.exports._serialize(row);
    } catch (err) {
      // checar duplicidade de caminho (uk_anexos_prontuario_caminho_arquivo)
      if (err && err.code && err.code === 'ER_DUP_ENTRY') {
        const e = new Error('caminho_arquivo ja existe'); e.code = 'BAD_REQUEST'; throw e;
      }
      throw err;
    }
  },

  async remover(fastify, prontuario_id, anexo_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) { const err = new Error('prontuario nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    const existente = await repositorio.buscarPorId(fastify, Number(anexo_id));
    if (!existente || existente.prontuario_id !== Number(prontuario_id)) { const err = new Error('anexo nao encontrado'); err.code = 'NOT_FOUND'; throw err; }

    const affected = await repositorio.remover(fastify, Number(anexo_id));
    return affected > 0;
  }
};
