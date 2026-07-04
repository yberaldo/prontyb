'use strict'

const servico = require('../servicos/prontuarios_anestesicos.servico');

function isPositiveIntValue(v) {
  const n = parseInt(v, 10);
  return !isNaN(n) && n > 0;
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
      const rows = await servico.listar(request.server, filtros);

      // mapear objetos relacionados
      const dados = rows.map(r => {
        const item = {
          id: r.id,
          numero_prontuario: r.numero_prontuario,
          clinica_id: r.clinica_id,
          nome_animal: r.nome_animal,
          especie: r.especie,
          raca: r.raca,
          sexo: r.sexo,
          idade: r.idade,
          peso: r.peso,
          nome_tutor: r.nome_tutor,
          nome_procedimento: r.nome_procedimento,
          data_procedimento: r.data_procedimento,
          cirurgiao_id: r.cirurgiao_id,
          anestesista_id: r.anestesista_id,
          observacoes_pre_anestesicas: r.observacoes_pre_anestesicas,
          criado_em: r.criado_em,
          atualizado_em: r.atualizado_em
        };

        if (r.clinica_nome || r.clinica_id) {
          item.clinica = { id: r.clinica_id || null, nome: r.clinica_nome || null };
        }
        if (r.anestesista_nome || r.anestesista_id) {
          item.anestesista = { id: r.anestesista_id || null, nome: r.anestesista_nome || null, crmv: r.anestesista_crmv || null, uf: r.anestesista_uf || null };
        }
        if (r.cirurgiao_nome || r.cirurgiao_id) {
          item.cirurgiao = { id: r.cirurgiao_id || null, nome: r.cirurgiao_nome || null, crmv: r.cirurgiao_crmv || null, uf: r.cirurgiao_uf || null };
        }

        return item;
      });

      return reply.send({ ok: true, dados });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando prontuarios_anestesicos');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscarPorId(request, reply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id) || id <= 0) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const registro = await servico.obterPorId(request.server, id);
      if (!registro) return reply.code(404).send({ ok: false, mensagem: 'prontuario nao encontrado' });

      const item = {
        id: registro.id,
        numero_prontuario: registro.numero_prontuario,
        clinica_id: registro.clinica_id,
        nome_animal: registro.nome_animal,
        especie: registro.especie,
        raca: registro.raca,
        sexo: registro.sexo,
        idade: registro.idade,
        peso: registro.peso,
        nome_tutor: registro.nome_tutor,
        nome_procedimento: registro.nome_procedimento,
        data_procedimento: registro.data_procedimento,
        cirurgiao_id: registro.cirurgiao_id,
        anestesista_id: registro.anestesista_id,
        observacoes_pre_anestesicas: registro.observacoes_pre_anestesicas,
        criado_em: registro.criado_em,
        atualizado_em: registro.atualizado_em
      };

      if (registro.clinica_nome || registro.clinica_id) item.clinica = { id: registro.clinica_id || null, nome: registro.clinica_nome || null };
      if (registro.anestesista_nome || registro.anestesista_id) item.anestesista = { id: registro.anestesista_id || null, nome: registro.anestesista_nome || null, crmv: registro.anestesista_crmv || null, uf: registro.anestesista_uf || null };
      if (registro.cirurgiao_nome || registro.cirurgiao_id) item.cirurgiao = { id: registro.cirurgiao_id || null, nome: registro.cirurgiao_nome || null, crmv: registro.cirurgiao_crmv || null, uf: registro.cirurgiao_uf || null };

      return reply.send({ ok: true, dados: item });
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
      const id = parseInt(request.params.id, 10);
      if (isNaN(id) || id <= 0) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });

      const body = request.body || {};
      if (!body || Object.keys(body).length === 0) return reply.code(400).send({ ok: false, mensagem: 'body vazio' });

      const allowed = ['numero_prontuario','clinica_id','nome_animal','especie','raca','sexo','idade','peso','nome_tutor','nome_procedimento','data_procedimento','cirurgiao_id','anestesista_id','observacoes_pre_anestesicas'];
      for (const k of Object.keys(body)) {
        if (!allowed.includes(k)) return reply.code(400).send({ ok: false, mensagem: 'campo desconhecido no body' });
      }

      try {
        const atualizado = await servico.atualizar(request.server, id, body);
        if (!atualizado) return reply.code(404).send({ ok: false, mensagem: 'prontuario nao encontrado' });
        return reply.send({ ok: true, dados: atualizado });
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
