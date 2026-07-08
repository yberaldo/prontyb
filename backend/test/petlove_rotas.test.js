'use strict'

const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const path = require('path');

const servicoReal = require(path.resolve(__dirname, '..', 'src', 'servicos', 'petlove_consulta.servico.js'));

function buildApp(servicoConsulta) {
  const app = Fastify({ logger: false });
  const rotasPath = path.resolve(__dirname, '..', 'src', 'rotas', 'petlove.rotas.js');
  app.register(require(rotasPath), { prefix: '/api', servicoConsulta });
  return app;
}

function assertCacheNoStore(headers) {
  assert.equal(headers['cache-control'], 'no-store');
}

test('POST padrao sem configuracao continua 503', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: { microchip: 'CHIP-FAKE-001' }
  });

  assert.equal(res.statusCode, 503);
  assertCacheNoStore(res.headers);
  assert.deepEqual(res.json(), {
    ok: false,
    codigo: 'PETLOVE_NAO_CONFIGURADA',
    mensagem: 'Busca Petlove nao configurada'
  });
});

test('POST valido retorna 503 sem dados nem petlove_id', async (t) => {
  const app = buildApp({
    ...servicoReal,
    async buscarPorMicrochip() {
      const erro = new Error('Busca Petlove nao configurada');
      erro.code = servicoReal.ERRO_PETLOVE_NAO_CONFIGURADA.code;
      throw erro;
    }
  });
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

test('POST configurado retorna paciente normalizado sem petlove_id', async (t) => {
  const app = buildApp({
    ...servicoReal,
    async buscarPorMicrochip(microchip) {
      assert.equal(microchip, 'CHIP-FAKE-001');
      return {
        origem_paciente: 'petlove',
        microchip,
        nome_animal: 'Animal Ficticio',
        especie: 'canina',
        raca: 'SRD',
        sexo: 'macho',
        data_nascimento: '2018-05-04',
        idade: '8 anos',
        peso: null,
        nome_tutor: 'Tutor Ficticio'
      };
    }
  });
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/petlove/pacientes/buscar-por-microchip',
    payload: { microchip: ' CHIP-FAKE-001 ' }
  });

  assert.equal(res.statusCode, 200);
  assertCacheNoStore(res.headers);
  const body = res.json();
  assert.equal(body.ok, true);
  assert.equal(body.dados.microchip, 'CHIP-FAKE-001');
  assert.equal(Object.prototype.hasOwnProperty.call(body.dados, 'petlove_id'), false);
  assert.deepEqual(body.meta, { fonte: 'petlove' });
});

for (const cenario of [
  { code: 'PETLOVE_NAO_AUTORIZADA', status: 503, mensagem: 'Acesso Petlove nao autorizado' },
  { code: 'PACIENTE_NAO_ENCONTRADO', status: 404, mensagem: 'Paciente nao encontrado na Petlove' },
  { code: 'PETLOVE_INDISPONIVEL', status: 503, mensagem: 'Busca Petlove temporariamente indisponivel' },
  { code: 'PETLOVE_RESPOSTA_INVALIDA', status: 502, mensagem: 'Resposta Petlove invalida' }
]) {
  test(`${cenario.code} retorna erro publico seguro`, async (t) => {
    const app = buildApp({
      ...servicoReal,
      async buscarPorMicrochip() {
        const erro = new Error(
          'Authorization=Bearer TESTE_NAO_VAZAR; Cookie=sessao-ficticia; token=TOKEN_NAO_VAZAR; payload=NAO_VAZAR'
        );
        erro.code = cenario.code;
        throw erro;
      }
    });
    t.after(() => app.close());

    const res = await app.inject({
      method: 'POST',
      url: '/api/petlove/pacientes/buscar-por-microchip',
      payload: { microchip: 'CHIP-FAKE-001' }
    });

    assert.equal(res.statusCode, cenario.status);
    assertCacheNoStore(res.headers);
    assert.deepEqual(res.json(), {
      ok: false,
      codigo: cenario.code,
      mensagem: cenario.mensagem
    });
    assert.equal(res.body.includes('sessao-ficticia'), false);
    assert.equal(res.body.includes('TESTE_NAO_VAZAR'), false);
    assert.equal(res.body.includes('TOKEN_NAO_VAZAR'), false);
    assert.equal(res.body.includes('NAO_VAZAR'), false);
    assert.equal(res.body.includes('Authorization'), false);
    assert.equal(res.body.includes('Cookie'), false);
    assert.equal(res.body.includes('token'), false);
    assert.equal(res.body.includes('payload'), false);
    assert.equal(res.body.includes('petlove_id'), false);
  });
}

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
  assert.equal(res.json().mensagem, 'campo desconhecido no body');
  assert.equal(res.body.includes('petlove_id'), false);
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
