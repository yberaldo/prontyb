'use strict'

const repositorio = require('../repositorios/monitorizacoes_prontuario.repositorio');
const prontuariosRepo = require('../repositorios/prontuarios_anestesicos.repositorio');

const STATUS_PERMITIDOS = ['pendente', 'extraido', 'revisado', 'erro'];

function criarErro(mensagem, code) {
  const err = new Error(mensagem);
  err.code = code;
  return err;
}

function parseJson(valor) {
  if (valor === null || typeof valor === 'undefined') return null;
  if (typeof valor !== 'string') return valor;
  try {
    return JSON.parse(valor);
  } catch (_) {
    return valor;
  }
}

function validarStatus(status) {
  if (status === null || typeof status === 'undefined' || status === '') return null;
  if (!STATUS_PERMITIDOS.includes(status)) throw criarErro('status invalido', 'BAD_REQUEST');
  return status;
}

module.exports = {
  STATUS_PERMITIDOS,

  _serializeMonitorizacao(reg) {
    if (!reg) return null;
    return {
      id: reg.id,
      prontuario_id: reg.prontuario_id,
      anexo_id: reg.anexo_id,
      status: reg.status,
      dados_json: parseJson(reg.dados_json),
      colunas_json: parseJson(reg.colunas_json),
      criado_em: reg.criado_em,
      atualizado_em: reg.atualizado_em,
      anexo: {
        id: reg.anexo_id_join,
        tipo_anexo: reg.anexo_tipo_anexo,
        nome_arquivo: reg.anexo_nome_arquivo,
        caminho_arquivo: reg.anexo_caminho_arquivo,
        mime_type: reg.anexo_mime_type,
        tamanho_bytes: Number(reg.anexo_tamanho_bytes)
      }
    };
  },

  _serializeLinha(reg) {
    if (!reg) return null;
    return {
      id: reg.id,
      prontuario_id: reg.prontuario_id,
      monitorizacao_extraida_id: reg.monitorizacao_extraida_id,
      horario: reg.horario,
      dados_json: parseJson(reg.dados_json),
      ordem: reg.ordem
    };
  },

  async listarPorProntuarioId(fastify, prontuario_id, filtros = {}) {
    const status = validarStatus(filtros.status);

    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) throw criarErro('prontuario nao encontrado', 'NOT_FOUND');

    const rows = await repositorio.listarPorProntuarioId(fastify, prontuario_id, { status });
    return rows.map(r => module.exports._serializeMonitorizacao(r));
  },

  async buscarPorId(fastify, prontuario_id, monitorizacao_extraida_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) throw criarErro('prontuario nao encontrado', 'NOT_FOUND');

    const reg = await repositorio.buscarPorId(fastify, monitorizacao_extraida_id, prontuario_id);
    if (!reg) throw criarErro('monitorizacao nao encontrada', 'NOT_FOUND');

    return module.exports._serializeMonitorizacao(reg);
  },

  async listarLinhas(fastify, prontuario_id, monitorizacao_extraida_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) throw criarErro('prontuario nao encontrado', 'NOT_FOUND');

    const monitorizacao = await repositorio.buscarPorId(fastify, monitorizacao_extraida_id, prontuario_id);
    if (!monitorizacao) throw criarErro('monitorizacao nao encontrada', 'NOT_FOUND');

    const rows = await repositorio.listarLinhasPorMonitorizacaoId(fastify, prontuario_id, monitorizacao_extraida_id);
    return rows.map(r => module.exports._serializeLinha(r));
  }
};
