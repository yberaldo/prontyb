'use strict'

const servico = require('../servicos/anexos_prontuario.servico');

function isPositiveIntValue(v) {
  const n = parseInt(v, 10);
  return !isNaN(n) && n > 0;
}

module.exports = {
  async listar(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      const dados = await servico.listarPorProntuarioId(request.server, Number(prontuario_id));
      return reply.send({ ok: true, dados });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando anexos');
      if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscar(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      const anexo_id = request.params.anexo_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      if (!isPositiveIntValue(anexo_id)) return reply.code(400).send({ ok: false, mensagem: 'anexo_id invalido' });
      const dados = await servico.buscarPorId(request.server, Number(prontuario_id), Number(anexo_id));
      return reply.send({ ok: true, dados });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro buscando anexo');
      if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
      if (err && err.code === 'BAD_REQUEST') return reply.code(400).send({ ok: false, mensagem: err.message });
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async criar(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      const body = request.body || {};
      try {
        const criado = await servico.criar(request.server, Number(prontuario_id), body);
        return reply.code(201).send({ ok: true, dados: criado });
      } catch (err) {
        if (err && err.code === 'BAD_REQUEST') return reply.code(400).send({ ok: false, mensagem: err.message });
        if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
        throw err;
      }
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro criando anexo');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async remover(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      const anexo_id = request.params.anexo_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      if (!isPositiveIntValue(anexo_id)) return reply.code(400).send({ ok: false, mensagem: 'anexo_id invalido' });

      try {
        await servico.remover(request.server, Number(prontuario_id), Number(anexo_id));
        return reply.send({ ok: true, mensagem: 'anexo removido' });
      } catch (err) {
        if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
        throw err;
      }
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro removendo anexo');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  }
};
