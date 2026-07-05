'use strict'

const servico = require('../servicos/farmacos.servico');

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
        if (busca === '') busca = null;
      }

      const ativoParam = parseBooleanParam(request.query && request.query.ativo);
      const hasAtivo = request.query && Object.prototype.hasOwnProperty.call(request.query, 'ativo');
      if (hasAtivo && ativoParam === null) {
        return reply.code(400).send({ ok: false, mensagem: 'ativo invalido' });
      }

      let categoria_chave = request.query.categoria_chave;
      if (typeof categoria_chave === 'string') {
        categoria_chave = categoria_chave.trim();
        if (categoria_chave === '') categoria_chave = null;
      }

      const filtros = {
        busca: busca || null,
        ativo: ativoParam === null ? null : (ativoParam ? 1 : 0),
        categoria_chave: categoria_chave || null
      };

      const rows = await servico.listar(request.server, filtros);
      return reply.send({ ok: true, dados: rows });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando farmacos');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscarPorId(request, reply) {
    try {
      const idParam = request.params.id;
      if (!isPositiveIntValue(idParam)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const registro = await servico.obterPorId(request.server, Number(idParam));
      if (!registro) return reply.code(404).send({ ok: false, mensagem: 'farmaco nao encontrado' });
      return reply.send({ ok: true, dados: registro });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro buscando farmaco por id');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async listarPorCategoria(request, reply) {
    try {
      const categoria_chave = request.params.categoria_chave;
      if (!categoria_chave || typeof categoria_chave !== 'string' || categoria_chave.trim() === '') {
        return reply.code(400).send({ ok: false, mensagem: 'categoria_chave obrigatoria' });
      }

      try {
        const rows = await servico.listarPorCategoria(request.server, categoria_chave.trim());
        return reply.send({ ok: true, dados: rows });
      } catch (err) {
        if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: 'categoria nao encontrada' });
        throw err;
      }
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando farmacos por categoria');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  }
};
