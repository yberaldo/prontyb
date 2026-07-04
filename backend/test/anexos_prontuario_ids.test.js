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

test('listar rejeita prontuario_id "1abc" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'anexos_prontuario.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { prontuario_id: '1abc' }, query: {}, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.listar(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'prontuario_id invalido');
});

test('buscar rejeita anexo_id "1abc" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'anexos_prontuario.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { prontuario_id: '1', anexo_id: '1abc' }, query: {}, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscar(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'anexo_id invalido');
});

test('remover rejeita anexo_id "1abc" com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'anexos_prontuario.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { prontuario_id: '1', anexo_id: '1abc' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.remover(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'anexo_id invalido');
});

test('listar com id valido chama servico', async () => {
  const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'anexos_prontuario.servico.js');
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'anexos_prontuario.controlador.js');

  clearCacheIfExists(servicePath);
  clearCacheIfExists(controllerPath);

  let called = false;
  setMockModule(servicePath, {
    listarPorProntuarioId: async (fastify, prontuario_id) => {
      called = true;
      // return an array to emulate serializacao posterior
      return [{ id: 123, prontuario_id }];
    }
  });

  const controller = require(controllerPath);

  const request = { params: { prontuario_id: '1' }, query: {}, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.listar(request, reply);

  assert.equal(called, true);
  assert.equal(reply._body && reply._body.ok, true);
  assert(Array.isArray(reply._body.dados));
  assert.equal(reply._body.dados[0].prontuario_id, 1);
});
