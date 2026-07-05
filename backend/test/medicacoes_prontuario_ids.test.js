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

// listar invalidos (prontuario_id)
['1abc','1.5','0','-1','abc'].forEach((val) => {
  test(`listar rejeita prontuario_id "${val}" com 400`, async () => {
    const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'medicacoes_prontuario.controlador.js');
    clearCacheIfExists(controllerPath);
    const controller = require(controllerPath);

    const request = { params: { prontuario_id: val }, server: {}, log: { error: () => {} } };
    const reply = createReplyMock();

    await controller.listar(request, reply);

    assert.equal(reply._code, 400);
    assert.equal(reply._body && reply._body.mensagem, 'prontuario_id invalido');
  });
});

test('listar com prontuario_id "1" chama servico e retorna sucesso', async () => {
  const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'medicacoes_prontuario.servico.js');
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'medicacoes_prontuario.controlador.js');

  clearCacheIfExists(servicePath);
  clearCacheIfExists(controllerPath);

  const SENTINEL_ID = 12345;
  setMockModule(servicePath, {
    listarPorProntuarioId: async (fastify, prontuarioId) => {
      return [{ id: SENTINEL_ID, prontuario_id: prontuarioId }];
    }
  });

  const controller = require(controllerPath);
  const request = { params: { prontuario_id: '1' }, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.listar(request, reply);

  assert.equal(reply._body && reply._body.ok, true);
  assert.equal(reply._body && reply._body.dados && reply._body.dados[0] && reply._body.dados[0].id, SENTINEL_ID);
});

// atualizar invalidos (medicacao_id)
['1abc','1.5','0','-1','abc'].forEach((val) => {
  test(`atualizar rejeita medicacao_id "${val}" com 400`, async () => {
    const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'medicacoes_prontuario.controlador.js');
    clearCacheIfExists(controllerPath);
    const controller = require(controllerPath);

    const request = { params: { prontuario_id: '1', medicacao_id: val }, server: {}, log: { error: () => {} }, body: {} };
    const reply = createReplyMock();

    await controller.atualizar(request, reply);

    assert.equal(reply._code, 400);
    assert.equal(reply._body && reply._body.mensagem, 'medicacao_id invalido');
  });
});

test('atualizar com medicacao_id "1" chama servico e retorna sucesso', async () => {
  const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'medicacoes_prontuario.servico.js');
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'medicacoes_prontuario.controlador.js');

  clearCacheIfExists(servicePath);
  clearCacheIfExists(controllerPath);

  let called = false;
  setMockModule(servicePath, {
    atualizar: async (fastify, prontuarioId, medicacaoId, body) => {
      called = true;
      return { id: medicacaoId, prontuario_id: prontuarioId };
    }
  });

  const controller = require(controllerPath);

  const request = { params: { prontuario_id: '1', medicacao_id: '1' }, server: {}, log: { error: () => {} }, body: {} };
  const reply = createReplyMock();

  await controller.atualizar(request, reply);

  assert.equal(called, true);
  assert.equal(reply._body && reply._body.ok, true);
  assert.equal(reply._body && reply._body.dados && reply._body.dados.id, 1);
});
