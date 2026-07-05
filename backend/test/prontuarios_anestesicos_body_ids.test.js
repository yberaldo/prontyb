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

function minimalBody(overrides = {}) {
  return Object.assign({
    numero_prontuario: 'NP-1',
    nome_animal: 'Rex',
    especie: 'Canis',
    nome_tutor: 'Tutor',
    nome_procedimento: 'Procedimento',
    data_procedimento: '2020-01-01',
    anestesista_id: 1
  }, overrides);
}

const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'prontuarios_anestesicos.servico.js');
const repoPath = path.resolve(__dirname, '..', 'src', 'repositorios', 'prontuarios_anestesicos.repositorio.js');

// --- criar: clinica_id invalidos
[['true', true], ['"01"', '01'], ['" 1"', ' 1'], ['"1.0"', '1.0'], ['0', 0]].forEach(([label, val]) => {
  test(`criar rejeita clinica_id ${label} com BAD_REQUEST`, async () => {
    clearCacheIfExists(repoPath);
    clearCacheIfExists(servicePath);

    let criarCalled = false;
    setMockModule(repoPath, {
      criar: async () => { criarCalled = true; return 1; },
      buscarPorId: async () => ({ id: 1 })
    });

    const servico = require(servicePath);
    const dados = minimalBody({ clinica_id: val, anestesista_id: 1 });

    try {
      await servico.criar({}, dados);
      assert.fail('expected criar to throw');
    } catch (err) {
      assert.equal(err && err.code, 'BAD_REQUEST');
      assert.equal(err && err.message, 'clinica_id invalido');
      assert.equal(criarCalled, false);
    }
  });
});

// aceitar clinica_id = 1 (number) e "1" (string)
[1, '1'].forEach((val) => {
  test(`criar aceita clinica_id ${JSON.stringify(val)}`, async () => {
    clearCacheIfExists(repoPath);
    clearCacheIfExists(servicePath);

    let criarCalled = false;
    setMockModule(repoPath, {
      criar: async (fastify, dados) => { criarCalled = true; return 777; },
      buscarPorId: async (fastify, id) => ({ id, numero_prontuario: 'NP', clinica_id: Number(val), nome_animal: 'R', especie: 'C', nome_tutor: 'T', nome_procedimento: 'P', data_procedimento: '2020-01-01', anestesista_id: 1 })
    });

    const servico = require(servicePath);

    const fastify = { mysql: { query: async (sql, params) => {
      if (sql && sql.toLowerCase().includes('from clinicas')) return [[{ id: Number(params[0]) }]];
      if (sql && sql.toLowerCase().includes('from profissionais')) return [[{ id: Number(params[0]) }]];
      return [[]];
    } } };

    const dados = minimalBody({ clinica_id: val, anestesista_id: 1 });
    const res = await servico.criar(fastify, dados);
    assert.equal(criarCalled, true);
    assert.equal(res && res.id, 777);
  });
});

// --- criar: anestesista invalidos
[['true', true], ['"01"', '01']].forEach(([label, val]) => {
  test(`criar rejeita anestesista_id ${label} com BAD_REQUEST`, async () => {
    clearCacheIfExists(repoPath);
    clearCacheIfExists(servicePath);

    let criarCalled = false;
    setMockModule(repoPath, {
      criar: async () => { criarCalled = true; return 1; },
      buscarPorId: async () => ({ id: 1 })
    });

    const servico = require(servicePath);
    const dados = minimalBody({ anestesista_id: val });

    try {
      await servico.criar({}, dados);
      assert.fail('expected criar to throw');
    } catch (err) {
      assert.equal(err && err.code, 'BAD_REQUEST');
      assert.equal(err && err.message, 'anestesista_id invalido');
      assert.equal(criarCalled, false);
    }
  });
});

// aceitar anestesista_id = 1 ou "1"
[1, '1'].forEach((val) => {
  test(`criar aceita anestesista_id ${JSON.stringify(val)}`, async () => {
    clearCacheIfExists(repoPath);
    clearCacheIfExists(servicePath);

    let criarCalled = false;
    setMockModule(repoPath, {
      criar: async () => { criarCalled = true; return 555; },
      buscarPorId: async (fastify, id) => ({ id, numero_prontuario: 'NP', anestesista_id: Number(val), nome_animal: 'R', especie: 'C', nome_tutor: 'T', nome_procedimento: 'P', data_procedimento: '2020-01-01' })
    });

    const servico = require(servicePath);
    const fastify = { mysql: { query: async (sql, params) => {
      if (sql && sql.toLowerCase().includes('from profissionais')) return [[{ id: Number(params[0]) }]];
      return [[]];
    } } };

    const dados = minimalBody({ anestesista_id: val });
    const res = await servico.criar(fastify, dados);
    assert.equal(criarCalled, true);
    assert.equal(res && res.id, 555);
  });
});

// --- criar: cirurgiao invalidos
[['true', true], ['"01"', '01']].forEach(([label, val]) => {
  test(`criar rejeita cirurgiao_id ${label} com BAD_REQUEST`, async () => {
    clearCacheIfExists(repoPath);
    clearCacheIfExists(servicePath);

    let criarCalled = false;
    setMockModule(repoPath, {
      criar: async () => { criarCalled = true; return 1; },
      buscarPorId: async () => ({ id: 1 })
    });

    const servico = require(servicePath);

    const fastify = { mysql: { query: async (sql, params) => {
      // anestesista existence check must pass before cirurgiao validation
      if (sql && sql.toLowerCase().includes('from profissionais')) return [[{ id: 1 }]];
      return [[]];
    } } };

    const dados = minimalBody({ anestesista_id: 1, cirurgiao_id: val });

    try {
      await servico.criar(fastify, dados);
      assert.fail('expected criar to throw');
    } catch (err) {
      assert.equal(err && err.code, 'BAD_REQUEST');
      assert.equal(err && err.message, 'cirurgiao_id invalido');
      assert.equal(criarCalled, false);
    }
  });
});

// aceitar cirurgiao_id = null (presente) e ausência
test('criar aceita cirurgiao_id null quando presente', async () => {
  clearCacheIfExists(repoPath);
  clearCacheIfExists(servicePath);

  let criarCalled = false;
  setMockModule(repoPath, {
    criar: async () => { criarCalled = true; return 888; },
    buscarPorId: async () => ({ id: 888 })
  });

  const servico = require(servicePath);
  const fastify = { mysql: { query: async (sql, params) => {
    if (sql && sql.toLowerCase().includes('from profissionais')) return [[{ id: Number(params[0]) }]];
    return [[]];
  } } };

  const dados = minimalBody({ anestesista_id: 1, cirurgiao_id: null });
  const res = await servico.criar(fastify, dados);
  assert.equal(criarCalled, true);
  assert.equal(res && res.id, 888);
});

test('criar aceita ausência de cirurgiao_id', async () => {
  clearCacheIfExists(repoPath);
  clearCacheIfExists(servicePath);

  let criarCalled = false;
  setMockModule(repoPath, {
    criar: async () => { criarCalled = true; return 889; },
    buscarPorId: async () => ({ id: 889 })
  });

  const servico = require(servicePath);
  const fastify = { mysql: { query: async (sql, params) => {
    if (sql && sql.toLowerCase().includes('from profissionais')) return [[{ id: Number(params[0]) }]];
    return [[]];
  } } };

  const dados = minimalBody({ anestesista_id: 1 });
  const res = await servico.criar(fastify, dados);
  assert.equal(criarCalled, true);
  assert.equal(res && res.id, 889);
});

// aceitar cirurgiao_id = 1 ou "1"
[1, '1'].forEach((val) => {
  test(`criar aceita cirurgiao_id ${JSON.stringify(val)}`, async () => {
    clearCacheIfExists(repoPath);
    clearCacheIfExists(servicePath);

    let criarCalled = false;
    setMockModule(repoPath, {
      criar: async () => { criarCalled = true; return 990; },
      buscarPorId: async () => ({ id: 990 })
    });

    const servico = require(servicePath);
    const fastify = { mysql: { query: async (sql, params) => {
      if (sql && sql.toLowerCase().includes('from profissionais')) return [[{ id: Number(params[0]) }]];
      return [[]];
    } } };

    const dados = minimalBody({ anestesista_id: 1, cirurgiao_id: val });
    const res = await servico.criar(fastify, dados);
    assert.equal(criarCalled, true);
    assert.equal(res && res.id, 990);
  });
});

// --- atualizar: validar que campos enviados seguem mesmas regras e não chamam repositório quando inválido

test('atualizar rejeita anestesista_id true e nao chama repositorio', async () => {
  clearCacheIfExists(repoPath);
  clearCacheIfExists(servicePath);

  let atualizarCalled = false;
  setMockModule(repoPath, {
    atualizar: async () => { atualizarCalled = true; return 1; },
    buscarPorId: async () => ({ id: 1 })
  });

  const servico = require(servicePath);
  try {
    await servico.atualizar({}, 1, { anestesista_id: true });
    assert.fail('expected atualizar to throw');
  } catch (err) {
    assert.equal(err && err.code, 'BAD_REQUEST');
    assert.equal(err && err.message, 'anestesista_id invalido');
    assert.equal(atualizarCalled, false);
  }
});

test('atualizar rejeita clinica_id "01" e nao chama repositorio', async () => {
  clearCacheIfExists(repoPath);
  clearCacheIfExists(servicePath);

  let atualizarCalled = false;
  setMockModule(repoPath, {
    atualizar: async () => { atualizarCalled = true; return 1; },
    buscarPorId: async () => ({ id: 1 })
  });

  const servico = require(servicePath);
  try {
    await servico.atualizar({}, 1, { clinica_id: '01' });
    assert.fail('expected atualizar to throw');
  } catch (err) {
    assert.equal(err && err.code, 'BAD_REQUEST');
    assert.equal(err && err.message, 'clinica_id invalido');
    assert.equal(atualizarCalled, false);
  }
});

test('atualizar rejeita cirurgiao_id "01" e nao chama repositorio', async () => {
  clearCacheIfExists(repoPath);
  clearCacheIfExists(servicePath);

  let atualizarCalled = false;
  setMockModule(repoPath, {
    atualizar: async () => { atualizarCalled = true; return 1; },
    buscarPorId: async () => ({ id: 1 })
  });

  const servico = require(servicePath);
  const fastify = { mysql: { query: async () => [[{ id: 1 }]] } };
  try {
    await servico.atualizar(fastify, 1, { cirurgiao_id: '01' });
    assert.fail('expected atualizar to throw');
  } catch (err) {
    assert.equal(err && err.code, 'BAD_REQUEST');
    assert.equal(err && err.message, 'cirurgiao_id invalido');
    assert.equal(atualizarCalled, false);
  }
});

// atualizar com campo valido chama repositorio
test('atualizar com clinica_id = 1 chama repositorio e retorna registro', async () => {
  clearCacheIfExists(repoPath);
  clearCacheIfExists(servicePath);

  let atualizarCalled = false;
  setMockModule(repoPath, {
    atualizar: async () => { atualizarCalled = true; return 1; },
    buscarPorId: async () => ({ id: 42 })
  });

  const servico = require(servicePath);
  const fastify = { mysql: { query: async (sql, params) => {
    if (sql && sql.toLowerCase().includes('from clinicas')) return [[{ id: Number(params[0]) }]];
    return [[{ id: Number(params[0]) }]];
  } } };

  const res = await servico.atualizar(fastify, 42, { clinica_id: 1 });
  assert.equal(atualizarCalled, true);
  assert.equal(res && res.id, 42);
});
