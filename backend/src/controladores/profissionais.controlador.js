'use strict'

const servico = require('../servicos/profissionais.servico');

function parseBooleanParam(valor) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === 'boolean') return valor;
  const s = String(valor).toLowerCase();
  if (s === '1' || s === 'true') return true;
  if (s === '0' || s === 'false') return false;
  return null;
}

const funcoesValidas = ['cirurgiao', 'anestesista', 'ambos'];

module.exports = {
  async listar(request, reply) {
    try {
      const busca = request.query.busca || null;
      const ativoParam = parseBooleanParam(request.query.ativo);
      const funcao = request.query.funcao || null;

      if (funcao && !funcoesValidas.includes(funcao)) return reply.code(400).send({ ok: false, mensagem: 'funcao invalida' });

      const filtros = { busca, ativo: ativoParam === null ? null : (ativoParam ? 1 : 0), funcao: funcao || null };
      const rows = await servico.listar(request.server, filtros);
      return reply.send({ ok: true, dados: rows });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando profissionais');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscarPorId(request, reply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const registro = await servico.obterPorId(request.server, id);
      if (!registro) return reply.code(404).send({ ok: false, mensagem: 'profissional nao encontrado' });
      return reply.send({ ok: true, dados: registro });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro buscando profissional por id');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async listarAnestesistas(request, reply) {
    try {
      const filtros = { busca: null, ativo: 1, funcao: ['anestesista', 'ambos'] };
      const rows = await servico.listar(request.server, filtros);
      return reply.send({ ok: true, dados: rows });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando anestesistas');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async listarCirurgioes(request, reply) {
    try {
      const filtros = { busca: null, ativo: 1, funcao: ['cirurgiao', 'ambos'] };
      const rows = await servico.listar(request.server, filtros);
      return reply.send({ ok: true, dados: rows });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando cirurgioes');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async criar(request, reply) {
    try {
      const body = request.body || {};
      const nome_completo = body.nome_completo && String(body.nome_completo).trim();
      if (!nome_completo) return reply.code(400).send({ ok: false, mensagem: 'nome_completo obrigatorio' });

      const funcao = body.funcao && String(body.funcao).trim();
      if (!funcao || !funcoesValidas.includes(funcao)) return reply.code(400).send({ ok: false, mensagem: 'funcao invalida' });

      const crmv = body.crmv ? String(body.crmv).trim() : null;
      const uf_crmv = body.uf_crmv ? String(body.uf_crmv).trim().toUpperCase() : null;
      if (uf_crmv && uf_crmv.length !== 2) return reply.code(400).send({ ok: false, mensagem: 'uf_crmv invalido' });

      const ativoParsed = parseBooleanParam(body.ativo);
      const ativo = ativoParsed === null ? 1 : (ativoParsed ? 1 : 0);

      const dados = { nome_completo, crmv, uf_crmv, funcao, ativo };

      const criado = await servico.criar(request.server, dados);
      return reply.code(201).send({ ok: true, dados: criado });
    } catch (err) {
      if (err && err.code === 'INVALIDA_FUNCAO') return reply.code(400).send({ ok: false, mensagem: 'funcao invalida' });
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro criando profissional');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async atualizar(request, reply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });

      const body = request.body || {};
      const dados = {};

      if (Object.prototype.hasOwnProperty.call(body, 'nome_completo')) {
        const n = body.nome_completo && String(body.nome_completo).trim();
        if (!n) return reply.code(400).send({ ok: false, mensagem: 'nome_completo nao pode ser vazio' });
        dados.nome_completo = n;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'crmv')) {
        dados.crmv = body.crmv ? String(body.crmv).trim() : null;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'uf_crmv')) {
        const uf = body.uf_crmv ? String(body.uf_crmv).trim().toUpperCase() : null;
        if (uf && uf.length !== 2) return reply.code(400).send({ ok: false, mensagem: 'uf_crmv invalido' });
        dados.uf_crmv = uf;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'funcao')) {
        const f = body.funcao ? String(body.funcao).trim() : null;
        if (!funcoesValidas.includes(f)) return reply.code(400).send({ ok: false, mensagem: 'funcao invalida' });
        dados.funcao = f;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'ativo')) {
        const ativoParsed = parseBooleanParam(body.ativo);
        if (ativoParsed === null) return reply.code(400).send({ ok: false, mensagem: 'ativo invalido' });
        dados.ativo = ativoParsed ? 1 : 0;
      }

      const atualizado = await servico.atualizar(request.server, id, dados);
      if (!atualizado) return reply.code(404).send({ ok: false, mensagem: 'profissional nao encontrado' });
      return reply.send({ ok: true, dados: atualizado });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro atualizando profissional');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async ativar(request, reply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const atualizado = await servico.ativar(request.server, id);
      if (!atualizado) return reply.code(404).send({ ok: false, mensagem: 'profissional nao encontrado' });
      return reply.send({ ok: true, dados: atualizado });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro ativando profissional');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async desativar(request, reply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) return reply.code(400).send({ ok: false, mensagem: 'id invalido' });
      const atualizado = await servico.desativar(request.server, id);
      if (!atualizado) return reply.code(404).send({ ok: false, mensagem: 'profissional nao encontrado' });
      return reply.send({ ok: true, dados: atualizado });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro desativando profissional');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  }
};
