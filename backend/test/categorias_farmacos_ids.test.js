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
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'categorias_farmacos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: '1abc' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('buscarPorId rejeita id "1.5" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'categorias_farmacos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: '1.5' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('buscarPorId rejeita id "0" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'categorias_farmacos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: '0' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('buscarPorId rejeita id "-1" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'categorias_farmacos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: '-1' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('buscarPorId rejeita id "abc" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'categorias_farmacos.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { id: 'abc' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscarPorId(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'id invalido');
});

test('buscarPorId com id "1" chama servico e retorna sucesso', async () => {
  const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'categorias_farmacos.servico.js');
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'categorias_farmacos.controlador.js');

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
