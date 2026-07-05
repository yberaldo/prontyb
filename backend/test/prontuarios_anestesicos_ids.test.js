'use strict'

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const Module = require('module');

function setMockModule(absPath, mockExports) {
  const resolved = require.resolve(absPath);
  const m = new Module(resolved, module);
  m.filename = resolved;
  m.paths = Module._nodeModulePaths(path.dirname(resolved));
  m.exports = mockExports;
  require.cache[resolved] = m;
}

function clearCacheIfExists(absPath) {
  try { const r = require.resolve(absPath); delete require.cache[r]; } catch (_) {}
}

function createReplyMock() {
  return {
    _code: null,
    _body: null,
    code(code) { this._code = code; return this; },
    send(body) { this._body = body; return body; }
  };
}

test('buscarPorId rejeita id "1abc" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: '1abc' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('buscarPorId rejeita id "1.5" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: '1.5' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('buscarPorId rejeita id "0" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: '0' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('buscarPorId rejeita id "-1" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: '-1' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('atualizar rejeita id "1abc" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: '1abc' }, body: {}, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.atualizar(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('listar rejeita clinica_id "1abc" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { query: { clinica_id: '1abc' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.listar(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'clinica_id invalido');
});

test('listar rejeita anestesista_id "1abc" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { query: { anestesista_id: '1abc' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.listar(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'anestesista_id invalido');
});

test('listar rejeita cirurgiao_id "1abc" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { query: { cirurgiao_id: '1abc' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.listar(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'cirurgiao_id invalido');
});

test('buscarPorId com id "1" chama servico e retorna sucesso', async () => {
  const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'prontuarios_anestesicos.servico.js');
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');

  clearCacheIfExists(servicePath);
  clearCacheIfExists(controllerPath);

  let called = false;
  setMockModule(servicePath, {
    obterPorId: async (fastify, id) => {
      called = true;
      return { id };
    }
  });

  const controller = require(controllerPath);

  const request = { params: { id: '1' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(called, true);
  assert.equal(reply._body && reply._body.ok, true);
  assert.equal(reply._body && reply._body.dados && reply._body.dados.id, 1);
});

test('listar sem filtros chama servico normalmente', async () => {
  const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'prontuarios_anestesicos.servico.js');
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');

  clearCacheIfExists(servicePath);
  clearCacheIfExists(controllerPath);

  let called = false;
  setMockModule(servicePath, {
    listar: async (fastify, filtros) => {
      called = true;
      return [];
    }
  });

  const controller = require(controllerPath);

  const request = { query: {}, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.listar(request, reply);

  assert.equal(called, true);
  assert.equal(reply._body && reply._body.ok, true);
});

test('listar com clinica_id "1" chama servico com filtro numerico', async () => {
  const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'prontuarios_anestesicos.servico.js');
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'prontuarios_anestesicos.controlador.js');

  clearCacheIfExists(servicePath);
  clearCacheIfExists(controllerPath);

  let receivedFiltros = null;
  setMockModule(servicePath, {
    listar: async (fastify, filtros) => {
      receivedFiltros = filtros;
      return [];
    }
  });

  const controller = require(controllerPath);

  const request = { query: { clinica_id: '1' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.listar(request, reply);

  assert.equal(reply._body && reply._body.ok, true);
  assert.equal(receivedFiltros && receivedFiltros.clinica_id, 1);
});
