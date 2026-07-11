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
    processarManualEstruturado: async () => ({}),
    importarConfirmadas: async () => ({})
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

function payloadConfirmadoValido(overrides = {}) {
  const base = {
    formato: 'trend-table-v1',
    parser_versao: 1,
    colunas: [
      { key: 'fc_bpm', label: 'FC', unidade: 'bpm', origem: 'PR' },
      { key: 'gas_mmhg', label: 'GAS', unidade: 'mmHg', origem: 'AA' }
    ],
    linhas: [
      {
        ordem: 0,
        data_medicao: '2026-04-14',
        horario: '12:25:00',
        dados: { fc_bpm: 122, gas_mmhg: 25.7 }
      }
    ]
  };
  return Object.assign(base, overrides);
}

function carregarServicoParaImportacao() {
  return loadServiceWithMocks({}, {});
}

test('importacao valida normaliza dados e calcula CAM sem arredondamento', () => {
  const servico = carregarServicoParaImportacao();
  const dados = servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido());

  assert.equal(dados.linhas.length, 1);
  assert.equal(dados.linhas[0].dados_json.gas_mmhg, 25.7);
  assert.equal(dados.linhas[0].dados_json.cam_percent, 25.7 / 760 * 100);
  assert.equal(dados.celulas_salvas, 3);
});

test('GAS zero nao e persistido nem gera CAM', () => {
  const servico = carregarServicoParaImportacao();
  const dados = servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({
    linhas: [{
      ordem: 0,
      data_medicao: '2026-04-14',
      horario: '12:25:00',
      dados: { fc_bpm: 122, gas_mmhg: 0 }
    }]
  }));

  assert.deepEqual(dados.linhas[0].dados_json, { fc_bpm: 122 });
  assert.equal(dados.celulas_salvas, 1);
});

test('importacao confirmada rejeita formato ou versao de parser invalidos', () => {
  const servico = carregarServicoParaImportacao();
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({ formato: 'outro' })),
    err => err.code === 'BAD_REQUEST' && /formato invalido/.test(err.message)
  );
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({ parser_versao: 2 })),
    err => err.code === 'BAD_REQUEST' && /parser_versao invalida/.test(err.message)
  );
});

test('importacao confirmada rejeita chave clinica proibida, data e horario invalidos', () => {
  const servico = carregarServicoParaImportacao();
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({
      linhas: [{ ordem: 0, data_medicao: '2026-04-14', horario: '12:25:00', dados: { HR: 122 } }]
    })),
    err => err.code === 'BAD_REQUEST' && /chave clinica invalida/.test(err.message)
  );
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({
      linhas: [{ ordem: 0, data_medicao: '2026-02-29', horario: '12:25:00', dados: { fc_bpm: 122 } }]
    })),
    err => err.code === 'BAD_REQUEST' && /data_medicao invalida/.test(err.message)
  );
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({
      linhas: [{ ordem: 0, data_medicao: '2026-04-14', horario: '24:25:00', dados: { fc_bpm: 122 } }]
    })),
    err => err.code === 'BAD_REQUEST' && /horario invalido/.test(err.message)
  );
});

test('importacao confirmada rejeita linha sem celula, SpO2 fora da faixa e numero negativo', () => {
  const servico = carregarServicoParaImportacao();
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({
      linhas: [{ ordem: 0, data_medicao: '2026-04-14', horario: '12:25:00', dados: { gas_mmhg: 0 } }]
    })),
    err => err.code === 'BAD_REQUEST' && /ao menos uma celula/.test(err.message)
  );
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({
      linhas: [{ ordem: 0, data_medicao: '2026-04-14', horario: '12:25:00', dados: { spo2_percent: 101 } }]
    })),
    err => err.code === 'BAD_REQUEST' && /fora do limite/.test(err.message)
  );
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({
      linhas: [{ ordem: 0, data_medicao: '2026-04-14', horario: '12:25:00', dados: { fc_bpm: -1 } }]
    })),
    err => err.code === 'BAD_REQUEST' && /fora do limite/.test(err.message)
  );
});

test('importacao confirmada rejeita mais de 2.000 linhas', () => {
  const servico = carregarServicoParaImportacao();
  const linhas = Array.from({ length: 2001 }, (_, ordem) => ({
    ordem,
    data_medicao: '2026-04-14',
    horario: '12:25:00',
    dados: { fc_bpm: 120 }
  }));
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({ linhas })),
    err => err.code === 'BAD_REQUEST' && /excede limite/.test(err.message)
  );
});

test('importacao confirmada detecta data e horario duplicados no payload com 409', () => {
  const servico = carregarServicoParaImportacao();
  const linha = { ordem: 0, data_medicao: '2026-04-14', horario: '12:25:00', dados: { fc_bpm: 120 } };
  const repetida = { ordem: 1, data_medicao: '2026-04-14', horario: '12:25:00', dados: { fr_rpm: 10 } };
  assert.throws(
    () => servico._validarBodyImportacaoConfirmada(payloadConfirmadoValido({ linhas: [linha, repetida] })),
    err => {
      assert.equal(err.code, 'CONFLICT');
      assert.deepEqual(err.conflitos, [{ data_medicao: '2026-04-14', horario: '12:25:00' }]);
      return true;
    }
  );
});

test('importacao confirmada valida pertencimento, tipo de anexo e status revisado', async () => {
  const body = payloadConfirmadoValido();
  let servico = loadServiceWithMocks({ buscarPorId: async () => null }, { buscarPorId: async () => ({ id: 1 }) });
  await assert.rejects(() => servico.importarConfirmadas({}, 1, 2, body), err => err.code === 'NOT_FOUND');

  servico = loadServiceWithMocks({
    buscarPorId: async () => ({ status: 'pendente', anexo_tipo_anexo: 'outro' })
  }, { buscarPorId: async () => ({ id: 1 }) });
  await assert.rejects(() => servico.importarConfirmadas({}, 1, 2, body), err => err.code === 'BAD_REQUEST');

  servico = loadServiceWithMocks({
    buscarPorId: async () => ({ status: 'revisado', anexo_tipo_anexo: 'pdf_monitorizacao' })
  }, { buscarPorId: async () => ({ id: 1 }) });
  await assert.rejects(() => servico.importarConfirmadas({}, 1, 2, body), err => err.code === 'CONFLICT' && /ja revisada/.test(err.message));
});

test('registros legados com data nula continuam serializaveis', () => {
  const servico = carregarServicoParaImportacao();
  assert.deepEqual(servico._serializeLinha({
    id: 1,
    prontuario_id: 2,
    monitorizacao_extraida_id: 3,
    data_medicao: null,
    horario: '12:00:00',
    dados_json: '{"fc_bpm":120}',
    ordem: 0
  }), {
    id: 1,
    prontuario_id: 2,
    monitorizacao_extraida_id: 3,
    data_medicao: null,
    horario: '12:00:00',
    dados_json: { fc_bpm: 120 },
    ordem: 0
  });
});

function carregarRepositorioRealMonitorizacao() {
  const repoPath = path.resolve(__dirname, '..', 'src', 'repositorios', 'monitorizacoes_prontuario.repositorio.js');
  clearCacheIfExists(repoPath);
  return require(repoPath);
}

function criarFastifyTransacional({ conflitos = [], erroNaAtualizacao = null } = {}) {
  const estado = { rollback: false, commit: false, inserts: 0, released: false };
  const conn = {
    async beginTransaction() {},
    async query(sql) {
      if (sql.includes('FROM monitorizacoes_extraidas')) {
        return [[{ id: 2, prontuario_id: 1, anexo_id: 3, status: 'pendente', anexo_tipo_anexo: 'pdf_monitorizacao' }]];
      }
      return [conflitos];
    },
    async execute(sql) {
      if (sql.includes('UPDATE monitorizacoes_extraidas')) {
        if (erroNaAtualizacao) throw erroNaAtualizacao;
        return [{ affectedRows: 1 }];
      }
      estado.inserts += 1;
      return [{ affectedRows: 1 }];
    },
    async rollback() { estado.rollback = true; },
    async commit() { estado.commit = true; },
    release() { estado.released = true; }
  };
  return { fastify: { mysql: { getConnection: async () => conn } }, estado };
}

test('conflito de data e horario faz rollback sem inserir linhas parciais', async () => {
  const repositorio = carregarRepositorioRealMonitorizacao();
  const { fastify, estado } = criarFastifyTransacional({
    conflitos: [{ data_medicao: '2026-04-14', horario: '12:25:00' }]
  });

  await assert.rejects(
    () => repositorio.importarConfirmadas(fastify, {
      prontuario_id: 1,
      monitorizacao_extraida_id: 2,
      arquivo_sha256: 'a'.repeat(64),
      colunas_json: [],
      dados_json: { formato: 'trend-table-v1', parser_versao: 1 },
      linhas: [{ ordem: 0, data_medicao: '2026-04-14', horario: '12:25:00', dados_json: { fc_bpm: 120 } }],
      celulas_salvas: 1
    }),
    err => err.code === 'CONFLICT' && Array.isArray(err.conflitos)
  );
  assert.equal(estado.rollback, true);
  assert.equal(estado.inserts, 0);
  assert.equal(estado.commit, false);
  assert.equal(estado.released, true);
});

test('duplicidade de SHA-256 do PDF retorna 409 e desfaz a transacao', async () => {
  const repositorio = carregarRepositorioRealMonitorizacao();
  const erroDuplicado = new Error('duplicate uk_monitorizacoes_extraidas_prontuario_arquivo_sha256');
  erroDuplicado.code = 'ER_DUP_ENTRY';
  const { fastify, estado } = criarFastifyTransacional({ erroNaAtualizacao: erroDuplicado });

  await assert.rejects(
    () => repositorio.importarConfirmadas(fastify, {
      prontuario_id: 1,
      monitorizacao_extraida_id: 2,
      arquivo_sha256: 'b'.repeat(64),
      colunas_json: [],
      dados_json: { formato: 'trend-table-v1', parser_versao: 1 },
      linhas: [{ ordem: 0, data_medicao: '2026-04-14', horario: '12:25:00', dados_json: { fc_bpm: 120 } }],
      celulas_salvas: 1
    }),
    err => err.code === 'CONFLICT'
  );
  assert.equal(estado.rollback, true);
  assert.equal(estado.inserts, 0);
  assert.equal(estado.commit, false);
});
