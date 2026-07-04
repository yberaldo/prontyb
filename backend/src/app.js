'use strict'

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const pluginBanco = require('./plugins/banco');
const saudeRotas = require('./rotas/saude.rotas');
const bancoRotas = require('./rotas/banco.rotas');
const clinicasRotas = require('./rotas/clinicas.rotas');
const profissionaisRotas = require('./rotas/profissionais.rotas');

function criarApp() {
  // cria instancia do fastify com logger
  const app = Fastify({ logger: true });

  // CORS: permitir qualquer origin em desenvolvimento; restringir em producao
  app.register(cors, { origin: true });

  // registrar plugin do banco (pool mysql)
  app.register(pluginBanco);

  // registrar rotas com prefixo /api
  app.register(clinicasRotas, { prefix: '/api' });
  app.register(profissionaisRotas, { prefix: '/api' });
  app.register(saudeRotas, { prefix: '/api' });
  app.register(bancoRotas, { prefix: '/api' });

  return app;
}

module.exports = { criarApp };
