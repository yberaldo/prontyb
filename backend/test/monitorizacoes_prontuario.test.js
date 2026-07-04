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

function loadServiceWithMocks(reposMock = {}, prontuariosMock = {}) {
  const repoPath = path.resolve(__dirname, '..', 'src', 'repositorios', 'monitorizacoes_prontuario.repositorio.js');
  const prontPath = path.resolve(__dirname, '..', 'src', 'repositorios', 'prontuarios_anestesicos.repositorio.js');
  const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'monitorizacoes_prontuario.servico.js');

  // ensure fresh
  [repoPath, prontPath, servicePath].forEach(p => clearCacheIfExists(p));

  setMockModule(repoPath, Object.assign({
    listarPorProntuarioId: async () => [],
    buscarPorId: async () => null,
    listarLinhasPorMonitorizacaoId: async () => [],
    marcarRevisada: async () => 0,
    processarManualEstruturado: async () => ({})
  }, reposMock));

  setMockModule(prontPath, Object.assign({
    buscarPorId: async () => null
  }, prontuariosMock));

  return require(servicePath);
}

function createReplyMock() {
  return {
    _code: null,
    _body: null,
    code(code) { this._code = code; return this; },
    send(body) { this._body = body; return body; }
  };
}

// Controller: validações de ID (400)
test('controlador rejeita prontuario_id invalido com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'monitorizacoes_prontuario.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { prontuario_id: 'abc', monitorizacao_extraida_id: '1' }, query: {}, body: {}, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscar(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'prontuario_id invalido');
});

test('controlador rejeita monitorizacao_extraida_id invalido com 400', async () => {
  const controllerPath = path.resolve(__dirname, '..', 'src', 'controladores', 'monitorizacoes_prontuario.controlador.js');
  clearCacheIfExists(controllerPath);
  const controller = require(controllerPath);

  const request = { params: { prontuario_id: '1', monitorizacao_extraida_id: 'abc' }, query: {}, body: {}, server: {}, log: { error: () => {} } };
  const reply = createReplyMock();

  await controller.buscar(request, reply);

  assert.equal(reply._code, 400);
  assert.equal(reply._body && reply._body.mensagem, 'monitorizacao_extraida_id invalido');
});

// Serviço: revisão e processamento manual — usando mocks para não tocar BD
test('revisar monitoração pendente resulta em 409', async () => {
  const servico = loadServiceWithMocks({
    buscarPorId: async (fastify, id, prontuario_id) => ({ id, prontuario_id, status: 'pendente' })
  }, {
    buscarPorId: async (fastify, prontuario_id) => ({ id: prontuario_id })
  });

  await assert.rejects(
    async () => servico.revisar({}, 10, 20, null),
    err => {
      assert.equal(err.code, 'CONFLICT');
      assert.match(err.message, /monitorizacao ainda nao foi extraida/);
      return true;
    }
  );
});

test('revisar monitoração extraida resulta em sucesso e status revisado', async () => {
  const servico = loadServiceWithMocks({
    buscarPorId: async (fastify, id, prontuario_id) => ({ id, prontuario_id, status: 'extraido' }),
    marcarRevisada: async (fastify, prontuario_id, monitorizacao_extraida_id) => 1
  }, {
    buscarPorId: async (fastify, prontuario_id) => ({ id: prontuario_id })
  });

  const resultado = await servico.revisar({}, 5, 77, null);
  assert.deepEqual(resultado, { id: 77, prontuario_id: 5, status: 'revisado' });
});

test('revisar monitoração ja revisada resulta em 409', async () => {
  const servico = loadServiceWithMocks({
    buscarPorId: async (fastify, id, prontuario_id) => ({ id, prontuario_id, status: 'revisado' })
  }, {
    buscarPorId: async (fastify, prontuario_id) => ({ id: prontuario_id })
  });

  await assert.rejects(
    async () => servico.revisar({}, 2, 3, null),
    err => { assert.equal(err.code, 'CONFLICT'); assert.match(err.message, /monitorizacao ja revisada/); return true; }
  );
});

test('revisar monitoração com status erro resulta em 409', async () => {
  const servico = loadServiceWithMocks({
    buscarPorId: async (fastify, id, prontuario_id) => ({ id, prontuario_id, status: 'erro' })
  }, {
    buscarPorId: async (fastify, prontuario_id) => ({ id: prontuario_id })
  });

  await assert.rejects(
    async () => servico.revisar({}, 2, 3, null),
    err => { assert.equal(err.code, 'CONFLICT'); assert.match(err.message, /monitorizacao com erro nao pode ser revisada/); return true; }
  );
});

test('revisar com body contendo campo extra resulta em 400', async () => {
  const servico = loadServiceWithMocks();

  await assert.rejects(
    async () => servico.revisar({}, 1, 1, { extra: true }),
    err => { assert.equal(err.code, 'BAD_REQUEST'); assert.match(err.message, /campo desconhecido no body: extra/); return true; }
  );
});

test('revisar monitoração inexistente resulta em 404', async () => {
  const servico = loadServiceWithMocks({
    buscarPorId: async () => null
  }, {
    buscarPorId: async (fastify, prontuario_id) => ({ id: prontuario_id })
  });

  await assert.rejects(
    async () => servico.revisar({}, 9, 99, null),
    err => { assert.equal(err.code, 'NOT_FOUND'); assert.match(err.message, /monitorizacao nao encontrada/); return true; }
  );
});

test('processamento manual rejeita reprocessamento quando status nao for pendente', async () => {
  const servico = loadServiceWithMocks({
    buscarPorId: async (fastify, id, prontuario_id) => ({ id, prontuario_id, status: 'extraido', anexo_tipo_anexo: 'pdf_monitorizacao' })
  }, {
    buscarPorId: async (fastify, prontuario_id) => ({ id: prontuario_id })
  });

  const bodyValido = {
    colunas_json: [],
    dados_json: null,
    linhas: [ { ordem: 1, horario: '12:00', dados_json: {} } ]
  };

  await assert.rejects(
    async () => servico.processarManual({}, 7, 8, bodyValido),
    err => { assert.equal(err.code, 'CONFLICT'); assert.match(err.message, /monitorizacao nao esta pendente/); return true; }
  );
});
