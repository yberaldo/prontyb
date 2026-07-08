'use strict'

const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const path = require('path');

function buildApp() {
  const app = Fastify({ logger: false });
  const rotasPath = path.resolve(__dirname, '..', 'src', 'rotas', 'petlove.rotas.js');
  app.register(require(rotasPath), { prefix: '/api' });
  return app;
}

function assertCacheNoStore(headers) {
  assert.equal(headers['cache-control'], 'no-store');
}

test('POST valido retorna 503 sem dados nem petlove_id', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: { microchip: '  CHIP-FAKE-001  ' }
  });

  assert.equal(res.statusCode, 503);
  assertCacheNoStore(res.headers);

  const body = res.json();
  assert.deepEqual(body, {
    ok: false,
    codigo: 'PETLOVE_NAO_CONFIGURADA',
    mensagem: 'Busca Petlove nao configurada'
  });
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'dados'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'petlove_id'), false);
});

test('GET com microchip na URL nao existe', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'GET',
    url: '/api/petlove/pacientes/buscar-por-microchip?microchip=CHIP-FAKE-001'
  });

  assert.equal(res.statusCode, 404);
});

test('body invalido retorna 400', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: []
  });

  assert.equal(res.statusCode, 400);
  assertCacheNoStore(res.headers);
  assert.equal(res.json().mensagem, 'body invalido');
});

test('microchip ausente retorna 400', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: {}
  });

  assert.equal(res.statusCode, 400);
  assertCacheNoStore(res.headers);
  assert.equal(res.json().mensagem, 'microchip obrigatorio');
});

test('microchip vazio retorna 400', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: { microchip: '   ' }
  });

  assert.equal(res.statusCode, 400);
  assertCacheNoStore(res.headers);
  assert.equal(res.json().mensagem, 'microchip vazio');
});

test('microchip nao string retorna 400', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: { microchip: 123 }
  });

  assert.equal(res.statusCode, 400);
  assertCacheNoStore(res.headers);
  assert.equal(res.json().mensagem, 'microchip invalido');
});

test('microchip maior que 40 retorna 400', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: { microchip: 'X'.repeat(41) }
  });

  assert.equal(res.statusCode, 400);
  assertCacheNoStore(res.headers);
  assert.equal(res.json().mensagem, 'microchip muito longo');
});

test('petlove_id retorna 400', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: { microchip: 'CHIP-FAKE-001', petlove_id: 123 }
  });

  assert.equal(res.statusCode, 400);
  assertCacheNoStore(res.headers);
  assert.equal(res.json().mensagem, 'petlove_id nao permitido');
});

test('campo desconhecido retorna 400', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: { microchip: 'CHIP-FAKE-001', foo: 'bar' }
  });

  assert.equal(res.statusCode, 400);
  assertCacheNoStore(res.headers);
  assert.equal(res.json().mensagem, 'campo desconhecido no body');
});
