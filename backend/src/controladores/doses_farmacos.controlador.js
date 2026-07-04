'use strict'

const servico = require('../servicos/doses_farmacos.servico');

function parseBooleanParam(valor) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === 'boolean') return valor;
  const s = String(valor).toLowerCase();
  if (s === '1' || s === 'true') return true;
  if (s === '0' || s === 'false') return false;
  return null;
}

module.exports = {
  async listar(request, reply) {
    try {
      // farmaco_id em query
      let farmaco_id = request.query.farmaco_id;
      if (typeof farmaco_id !== 'undefined' && farmaco_id !== null && farmaco_id !== '') {
        farmaco_id = parseInt(farmaco_id, 10);
        if (isNaN(farmaco_id) || farmaco_id <= 0) return reply.code(400).send({ ok: false, mensagem: 'farmaco_id invalido' });
      } else {
        farmaco_id = null;
      }

      // categoria_chave
      let categoria_chave = request.query.categoria_chave;
      if (typeof categoria_chave === 'string') {
        categoria_chave = categoria_chave.trim();
        if (categoria_chave === '') categoria_chave = null;
      }

      // especie e via não existem na migration de doses_farmacos, serão ignorados se passados

      const ativoParam = parseBooleanParam(request.query && request.query.ativo);
      const hasAtivo = request.query && Object.prototype.hasOwnProperty.call(request.query, 'ativo');
      if (hasAtivo && ativoParam === null) {
        return reply.code(400).send({ ok: false, mensagem: 'ativo invalido' });
      }

      const filtros = { farmaco_id, categoria_chave, ativo: ativoParam === null ? null : (ativoParam ? 1 : 0) };
      const rows = await servico.listar(request.server, filtros);
      return reply.send({ ok: true, dados: rows });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando doses_farmacos');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscarPorId(request, reply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id) || id <= 0) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const registro = await servico.obterPorId(request.server, id);
      if (!registro) return reply.code(404).send({ ok: false, mensagem: 'dose nao encontrada' });
      return reply.send({ ok: true, dados: registro });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro buscando dose por id');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async listarPorFarmaco(request, reply) {
    try {
      const farmaco_id = parseInt(request.params.farmaco_id, 10);
      if (isNaN(farmaco_id) || farmaco_id <= 0) return reply.code(400).send({ ok: false, mensagem: 'farmaco_id invalido' });

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

      // especie, via são ignorados se passados

      try {
        const rows = await servico.listarPorFarmaco(request.server, farmaco_id, { categoria_chave, ativo: ativoParam === null ? null : (ativoParam ? 1 : 0) });
        return reply.send({ ok: true, dados: rows });
      } catch (err) {
        if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: 'farmaco nao encontrado' });
        throw err;
      }
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando doses por farmaco');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  }
};
