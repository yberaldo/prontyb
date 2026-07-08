'use strict'

const servico = require('../servicos/prontuarios_anestesicos.servico');

function isPositiveIntValue(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return false;
  const s = String(v);
  if (!/^[1-9][0-9]*$/.test(s)) return false;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0;
}

function isValidDateString(s) {
  if (!s) return false;
  // aceitar YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

module.exports = {
  async listar(request, reply) {
    try {
      let { busca } = request.query || {};
      if (typeof busca === 'string') {
        busca = busca.trim(); if (busca === '') busca = null;
      }

      let clinica_id = request.query && request.query.clinica_id;
      if (typeof clinica_id !== 'undefined' && clinica_id !== null && clinica_id !== '') {
        if (!isPositiveIntValue(clinica_id)) return reply.code(400).send({ ok: false, mensagem: 'clinica_id invalido' });
        clinica_id = parseInt(clinica_id, 10);
      } else clinica_id = null;

      let anestesista_id = request.query && request.query.anestesista_id;
      if (typeof anestesista_id !== 'undefined' && anestesista_id !== null && anestesista_id !== '') {
        if (!isPositiveIntValue(anestesista_id)) return reply.code(400).send({ ok: false, mensagem: 'anestesista_id invalido' });
        anestesista_id = parseInt(anestesista_id, 10);
      } else anestesista_id = null;

      let cirurgiao_id = request.query && request.query.cirurgiao_id;
      if (typeof cirurgiao_id !== 'undefined' && cirurgiao_id !== null && cirurgiao_id !== '') {
        if (!isPositiveIntValue(cirurgiao_id)) return reply.code(400).send({ ok: false, mensagem: 'cirurgiao_id invalido' });
        cirurgiao_id = parseInt(cirurgiao_id, 10);
      } else cirurgiao_id = null;

      let data_inicio = request.query && request.query.data_inicio;
      if (typeof data_inicio === 'string') { data_inicio = data_inicio.trim(); if (data_inicio === '') data_inicio = null; }
      if (data_inicio && !isValidDateString(data_inicio)) return reply.code(400).send({ ok: false, mensagem: 'data_inicio invalida' });

      let data_fim = request.query && request.query.data_fim;
      if (typeof data_fim === 'string') { data_fim = data_fim.trim(); if (data_fim === '') data_fim = null; }
      if (data_fim && !isValidDateString(data_fim)) return reply.code(400).send({ ok: false, mensagem: 'data_fim invalida' });

      const filtros = { busca: busca || null, clinica_id, anestesista_id, cirurgiao_id, data_inicio: data_inicio || null, data_fim: data_fim || null };
      const dados = await servico.listar(request.server, filtros);
      return reply.send({ ok: true, dados });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando prontuarios_anestesicos');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscarPorId(request, reply) {
    try {
      const idParam = request.params.id;
      if (!isPositiveIntValue(idParam)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const registro = await servico.obterPorId(request.server, Number(idParam));
      if (!registro) return reply.code(404).send({ ok: false, mensagem: 'prontuario nao encontrado' });
      return reply.send({ ok: true, dados: registro });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro buscando prontuario por id');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async criar(request, reply) {
    try {
      const body = request.body || {};
      const allowed = ['numero_prontuario','clinica_id','nome_animal','especie','raca','sexo','idade','peso','nome_tutor','nome_procedimento','data_procedimento','cirurgiao_id','anestesista_id','observacoes_pre_anestesicas'];
      // rejeitar campos desconhecidos
      for (const k of Object.keys(body)) {
        if (!allowed.includes(k)) return reply.code(400).send({ ok: false, mensagem: 'campo desconhecido no body' });
      }

      try {
        const criado = await servico.criar(request.server, body);
        return reply.code(201).send({ ok: true, dados: criado });
      } catch (err) {
        if (err && err.code === 'BAD_REQUEST') return reply.code(400).send({ ok: false, mensagem: err.message });
        if (err && err.code === 'DUPLICATE') return reply.code(400).send({ ok: false, mensagem: 'numero_prontuario duplicado' });
        throw err;
      }
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro criando prontuario');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async atualizar(request, reply) {
    try {
      const idParam = request.params.id;
      if (!isPositiveIntValue(idParam)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const id = Number(idParam);

      const body = request.body || {};
      if (!body || Object.keys(body).length === 0) return reply.code(400).send({ ok: false, mensagem: 'body vazio' });

      const allowed = ['numero_prontuario','clinica_id','nome_animal','especie','raca','sexo','idade','peso','nome_tutor','nome_procedimento','data_procedimento','cirurgiao_id','anestesista_id','observacoes_pre_anestesicas'];
      for (const k of Object.keys(body)) {
        if (!allowed.includes(k)) return reply.code(400).send({ ok: false, mensagem: 'campo desconhecido no body' });
      }

      try {
        const atualizado = await servico.atualizar(request.server, id, body);
        if (!atualizado) return reply.code(404).send({ ok: false, mensagem: 'prontuario nao encontrado' });
        const dados = servico._serialize(atualizado);
        return reply.send({ ok: true, dados });
      } catch (err) {
        if (err && err.code === 'BAD_REQUEST') return reply.code(400).send({ ok: false, mensagem: err.message });
        throw err;
      }
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro atualizando prontuario');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  }
};
