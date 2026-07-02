#!/usr/bin/env node
'use strict'

// Carrega variaveis de ambiente e inicia o servidor
const { PORTA, HOST } = require('./configuracoes/ambiente');
const { criarApp } = require('./app');

async function start() {
  const app = await criarApp();
  try {
    await app.listen({ port: parseInt(PORTA, 10), host: HOST });
    app.log.info(`Servidor iniciado em http://${HOST}:${PORTA}`);
  } catch (err) {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
}

start();
