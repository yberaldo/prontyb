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

function minimalBodyForCriar(overrides = {}) {
  return Object.assign({ categoria: 'A', subcategoria: 'S', farmaco_id: 1 }, overrides);
}

const servicePath = path.resolve(__dirname, '..', 'src', 'servicos', 'medicacoes_prontuario.servico.js');
const repoMedicacoesPath = path.resolve(__dirname, '..', 'src', 'repositorios', 'medicacoes_prontuario.repositorio.js');
const repoProntuariosPath = path.resolve(__dirname, '..', 'src', 'repositorios', 'prontuarios_anestesicos.repositorio.js');
const repoFarmacosPath = path.resolve(__dirname, '..', 'src', 'repositorios', 'farmacos.repositorio.js');

// criar: invalidos
[['true', true], ['false', false], ['"01"', '01'], ['" 1"', ' 1'], ['"1 "', '1 '], ['"1.0"', '1.0'], ['"1.5"', '1.5'], ['0', 0], ['-1', -1], ['{}', {}], ['[]', []]].forEach(([label, val]) => {
  test(`criar rejeita farmaco_id ${label} com BAD_REQUEST`, async () => {
    clearCacheIfExists(repoMedicacoesPath);
    clearCacheIfExists(repoProntuariosPath);
    clearCacheIfExists(repoFarmacosPath);
    clearCacheIfExists(servicePath);

    let criarCalled = false;
    let farmacoBuscarCalled = false;

    setMockModule(repoMedicacoesPath, {
      criar: async () => { criarCalled = true; return 1; },
      buscarPorId: async () => ({ id: 1 }),
      existeFarmacosCategoria: async () => true
    });

    setMockModule(repoProntuariosPath, {
      buscarPorId: async () => ({ id: 1 })
    });

    setMockModule(repoFarmacosPath, {
      buscarPorId: async () => { farmacoBuscarCalled = true; return { id: 1 }; }
    });

    const servico = require(servicePath);
    const dados = minimalBodyForCriar({ farmaco_id: val });

    try {
      await servico.criar({}, 1, dados);
      assert.fail('expected criar to throw');
    } catch (err) {
      assert.equal(err && err.code, 'BAD_REQUEST');
      assert.equal(err && err.message, 'farmaco_id invalido');
      assert.equal(criarCalled, false);
      // farmaco lookup must not be called for invalid body
      assert.equal(farmacoBuscarCalled, false);
    }
  });
});

// criar: aceita 1 e "1"
[1, '1'].forEach((val) => {
  test(`criar aceita farmaco_id ${JSON.stringify(val)}`, async () => {
    clearCacheIfExists(repoMedicacoesPath);
    clearCacheIfExists(repoProntuariosPath);
    clearCacheIfExists(repoFarmacosPath);
    clearCacheIfExists(servicePath);

    let criarCalled = false;
    setMockModule(repoMedicacoesPath, {
      criar: async (fastify, dados) => { criarCalled = true; return 777; },
      buscarPorId: async (fastify, id) => ({ id }) ,
      existeFarmacosCategoria: async () => true
    });

    setMockModule(repoProntuariosPath, {
      buscarPorId: async () => ({ id: 1 })
    });

    setMockModule(repoFarmacosPath, {
      buscarPorId: async () => ({ id: 1 })
    });

    const servico = require(servicePath);
    const fastify = { mysql: { query: async () => [[]] } };

    const dados = minimalBodyForCriar({ farmaco_id: val });
    const res = await servico.criar(fastify, 1, dados);
    assert.equal(criarCalled, true);
    assert.equal(res && res.id, 777);
  });
});

// atualizar: preparar mocks for existence checks
function prepareAtualizarMocks() {
  clearCacheIfExists(repoMedicacoesPath);
  clearCacheIfExists(repoProntuariosPath);
  clearCacheIfExists(repoFarmacosPath);
  clearCacheIfExists(servicePath);

  // default: prontuario exists and medicacao exists and belongs to prontuario
  setMockModule(repoProntuariosPath, { buscarPorId: async () => ({ id: 1 }) });
  setMockModule(repoMedicacoesPath, {
    buscarPorId: async () => ({ id: 10, prontuario_id: 1, farmaco_id: 1 }),
    atualizar: async () => { return 1; },
    existeFarmacosCategoria: async () => true
  });
}

// atualizar: invalids should not call repositorio.atualizar
[['true', true], ['"01"', '01'], ['"1.0"', '1.0']].forEach(([label, val]) => {
  test(`atualizar rejeita farmaco_id ${label} e nao chama repositorio`, async () => {
    prepareAtualizarMocks();

    let atualizarCalled = false;
    let farmacoBuscarCalled = false;

    setMockModule(repoMedicacoesPath, {
      buscarPorId: async () => ({ id: 10, prontuario_id: 1, farmaco_id: 1 }),
      atualizar: async () => { atualizarCalled = true; return 1; },
      existeFarmacosCategoria: async () => true
    });

    setMockModule(repoFarmacosPath, {
      buscarPorId: async () => { farmacoBuscarCalled = true; return { id: 1 }; }
    });

    const servico = require(servicePath);

    try {
      await servico.atualizar({}, 1, 10, { farmaco_id: val });
      assert.fail('expected atualizar to throw');
    } catch (err) {
      assert.equal(err && err.code, 'BAD_REQUEST');
      assert.equal(err && err.message, 'farmaco_id invalido');
      assert.equal(atualizarCalled, false);
      assert.equal(farmacoBuscarCalled, false);
    }
  });
});

// atualizar aceita ausencia de farmaco_id (nao enviado)
test('atualizar aceita ausencia de farmaco_id e chama repositorio', async () => {
  prepareAtualizarMocks();

  let atualizarCalled = false;
  setMockModule(repoMedicacoesPath, {
    buscarPorId: async () => ({ id: 10, prontuario_id: 1, farmaco_id: 1 }),
    atualizar: async () => { atualizarCalled = true; return 1; },
    existeFarmacosCategoria: async () => true
  });

  const servico = require(servicePath);
  const res = await servico.atualizar({}, 1, 10, { unidade: 'mg' });
  assert.equal(atualizarCalled, true);
  assert.equal(res && res.id, 10);
});

// atualizar aceita farmaco_id = 1 e "1"
[1, '1'].forEach((val) => {
  test(`atualizar aceita farmaco_id ${JSON.stringify(val)} e chama repositorio`, async () => {
    prepareAtualizarMocks();

    let atualizarCalled = false;
    let farmacoBuscarCalled = false;

    setMockModule(repoMedicacoesPath, {
      buscarPorId: async () => ({ id: 10, prontuario_id: 1, farmaco_id: 1 }),
      atualizar: async () => { atualizarCalled = true; return 1; },
      existeFarmacosCategoria: async () => true
    });

    setMockModule(repoFarmacosPath, {
      buscarPorId: async () => { farmacoBuscarCalled = true; return { id: 1 }; }
    });

    const servico = require(servicePath);
    const res = await servico.atualizar({}, 1, 10, { farmaco_id: val });
    assert.equal(farmacoBuscarCalled, true);
    assert.equal(atualizarCalled, true);
    assert.equal(res && res.id, 10);
  });
});
