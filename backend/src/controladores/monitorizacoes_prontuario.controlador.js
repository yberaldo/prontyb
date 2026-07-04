'use strict'

const servico = require('../servicos/monitorizacoes_prontuario.servico');

function isPositiveIntValue(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return false;
  const s = String(v);
  if (!/^[1-9][0-9]*$/.test(s)) return false;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0;
}

function tratarErroConhecido(err, reply) {
  if (err && err.code === 'BAD_REQUEST') return reply.code(400).send({ ok: false, mensagem: err.message });
  if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
  if (err && err.code === 'CONFLICT') return reply.code(409).send({ ok: false, mensagem: err.message });
  return null;
}

module.exports = {
  async listar(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });

      const status = request.query && Object.prototype.hasOwnProperty.call(request.query, 'status')
        ? request.query.status
        : null;

      const dados = await servico.listarPorProntuarioId(request.server, Number(prontuario_id), { status });
      return reply.send({ ok: true, dados });
    } catch (err) {
      const resposta = tratarErroConhecido(err, reply);
      if (resposta) return resposta;
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando monitorizacoes');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscar(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      const monitorizacao_extraida_id = request.params.monitorizacao_extraida_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      if (!isPositiveIntValue(monitorizacao_extraida_id)) return reply.code(400).send({ ok: false, mensagem: 'monitorizacao_extraida_id invalido' });

      const dados = await servico.buscarPorId(request.server, Number(prontuario_id), Number(monitorizacao_extraida_id));
      return reply.send({ ok: true, dados });
    } catch (err) {
      const resposta = tratarErroConhecido(err, reply);
      if (resposta) return resposta;
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro buscando monitorizacao');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async listarLinhas(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      const monitorizacao_extraida_id = request.params.monitorizacao_extraida_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      if (!isPositiveIntValue(monitorizacao_extraida_id)) return reply.code(400).send({ ok: false, mensagem: 'monitorizacao_extraida_id invalido' });

      const dados = await servico.listarLinhas(request.server, Number(prontuario_id), Number(monitorizacao_extraida_id));
      return reply.send({ ok: true, dados });
    } catch (err) {
      const resposta = tratarErroConhecido(err, reply);
      if (resposta) return resposta;
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando linhas de monitorizacao');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async processarManual(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      const monitorizacao_extraida_id = request.params.monitorizacao_extraida_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      if (!isPositiveIntValue(monitorizacao_extraida_id)) return reply.code(400).send({ ok: false, mensagem: 'monitorizacao_extraida_id invalido' });

      const dados = await servico.processarManual(
        request.server,
        Number(prontuario_id),
        Number(monitorizacao_extraida_id),
        request.body
      );

      return reply.send({
        ok: true,
        mensagem: 'monitorizacao processada',
        dados
      });
    } catch (err) {
      const resposta = tratarErroConhecido(err, reply);
      if (resposta) return resposta;
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro processando monitorizacao manual');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  }
};
