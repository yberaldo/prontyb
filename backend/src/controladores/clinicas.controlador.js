'use strict'

const servico = require('../servicos/clinicas.servico');

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
      const busca = request.query.busca || null;
      const ativoParam = parseBooleanParam(request.query.ativo);
      const filtros = { busca, ativo: ativoParam === null ? null : (ativoParam ? 1 : 0) };
      const rows = await servico.listar(request.server, filtros);
      return reply.send({ ok: true, dados: rows });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando clinicas');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscarPorId(request, reply) {
    try {
      const idParam = request.params.id;
      if (!isPositiveIntValue(idParam)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const registro = await servico.obterPorId(request.server, Number(idParam));
      if (!registro) return reply.code(404).send({ ok: false, mensagem: 'clinica nao encontrada' });
      return reply.send({ ok: true, dados: registro });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro buscando clinica por id');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async criar(request, reply) {
    try {
      const body = request.body || {};
      const nome = body.nome && String(body.nome).trim();
      if (!nome) return reply.code(400).send({ ok: false, mensagem: 'nome obrigatorio' });

      const estado = body.estado ? String(body.estado).trim() : null;
      if (estado && estado.length !== 2) return reply.code(400).send({ ok: false, mensagem: 'estado invalido' });

      const ativoParsed = parseBooleanParam(body.ativo);
      const ativo = ativoParsed === null ? 1 : (ativoParsed ? 1 : 0);

      const dados = {
        nome,
        endereco: body.endereco || null,
        cidade: body.cidade || null,
        estado: estado || null,
        ativo
      };

      const criado = await servico.criar(request.server, dados);
      return reply.code(201).send({ ok: true, dados: criado });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro criando clinica');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async atualizar(request, reply) {
    try {
      const idParam = request.params.id;
      if (!isPositiveIntValue(idParam)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const id = Number(idParam);

      const body = request.body || {};
      const dados = {};

      if (Object.prototype.hasOwnProperty.call(body, 'nome')) {
        const nome = body.nome && String(body.nome).trim();
        if (!nome) return reply.code(400).send({ ok: false, mensagem: 'nome nao pode ser vazio' });
        dados.nome = nome;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'endereco')) dados.endereco = body.endereco || null;
      if (Object.prototype.hasOwnProperty.call(body, 'cidade')) dados.cidade = body.cidade || null;
      if (Object.prototype.hasOwnProperty.call(body, 'estado')) {
        const estado = body.estado ? String(body.estado).trim() : null;
        if (estado && estado.length !== 2) return reply.code(400).send({ ok: false, mensagem: 'estado invalido' });
        dados.estado = estado;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'ativo')) {
        const ativoParsed = parseBooleanParam(body.ativo);
        if (ativoParsed === null) return reply.code(400).send({ ok: false, mensagem: 'ativo invalido' });
        dados.ativo = ativoParsed ? 1 : 0;
      }

      const atualizado = await servico.atualizar(request.server, id, dados);
      if (!atualizado) return reply.code(404).send({ ok: false, mensagem: 'clinica nao encontrada' });
      return reply.send({ ok: true, dados: atualizado });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro atualizando clinica');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async ativar(request, reply) {
    try {
      const idParam = request.params.id;
      if (!isPositiveIntValue(idParam)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const atualizado = await servico.ativar(request.server, Number(idParam));
      if (!atualizado) return reply.code(404).send({ ok: false, mensagem: 'clinica nao encontrada' });
      return reply.send({ ok: true, dados: atualizado });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro ativando clinica');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async desativar(request, reply) {
    try {
      const idParam = request.params.id;
      if (!isPositiveIntValue(idParam)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const atualizado = await servico.desativar(request.server, Number(idParam));
      if (!atualizado) return reply.code(404).send({ ok: false, mensagem: 'clinica nao encontrada' });
      return reply.send({ ok: true, dados: atualizado });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro desativando clinica');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  }
};
