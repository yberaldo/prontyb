'use strict'

const servico = require('../servicos/categorias_farmacos.servico');

function parseBooleanParam(valor) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === 'boolean') return valor;
  const s = String(valor).toLowerCase();
  if (s === '1' || s === 'true') return true;
  if (s === '0' || s === 'false') return false;
  return null;
}

function isPositiveIntValue(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return false;
  const s = String(v);
  if (!/^[1-9][0-9]*$/.test(s)) return false;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0;
}

module.exports = {
  async listar(request, reply) {
    try {
      let busca = request.query.busca;
      if (typeof busca === 'string') {
        busca = busca.trim();
        if (busca === '') busca = null; // busca vazia ignorada
      }

      const ativoParam = parseBooleanParam(request.query && request.query.ativo);
      const hasAtivo = request.query && Object.prototype.hasOwnProperty.call(request.query, 'ativo');
      if (hasAtivo && ativoParam === null) {
        return reply.code(400).send({ ok: false, mensagem: 'ativo invalido' });
      }

      const filtros = { busca: busca || null, ativo: ativoParam === null ? null : (ativoParam ? 1 : 0) };
      const rows = await servico.listar(request.server, filtros);
      return reply.send({ ok: true, dados: rows });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando categorias_farmacos');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscarPorId(request, reply) {
    try {
      const idParam = request.params && request.params.id;
      if (!isPositiveIntValue(idParam)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const registro = await servico.obterPorId(request.server, Number(idParam));
      if (!registro) return reply.code(404).send({ ok: false, mensagem: 'categoria nao encontrada' });
      return reply.send({ ok: true, dados: registro });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro buscando categoria por id');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  }
};
