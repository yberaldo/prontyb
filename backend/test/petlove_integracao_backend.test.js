'use strict'

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const raizServicos = path.resolve(__dirname, '..', 'src', 'servicos');
const {
  TIMEOUT_PADRAO_MS,
  validarConfiguracaoPetlove
} = require(path.join(raizServicos, 'petlove_configuracao.servico.js'));
const {
  CODIGOS_ERRO_CLIENT,
  criarClientPetlove
} = require(path.join(raizServicos, 'petlove_client.servico.js'));
const {
  ERRO_PETLOVE_NAO_CONFIGURADA,
  criarServicoConsulta
} = require(path.join(raizServicos, 'petlove_consulta.servico.js'));

function entradaConfigurada(sobrescritas = {}) {
  return {
    buscaHabilitada: 'true',
    baseUrl: 'https://petlove.invalid',
    authCookie: 'sessao=ficticia',
    ...sobrescritas
  };
}

function pacienteBruto(sobrescritas = {}) {
  return {
    name: 'Animal Ficticio',
    microchip: 'CHIP-FAKE-001',
    race: {
      name: 'SRD',
      specie: { name: 'Cachorro' }
    },
    sex: 'Macho',
    birthday: '2018-05-04',
    user_name: 'Tutor Ficticio',
    userPetWeightHistoric: [],
    ...sobrescritas
  };
}

function resposta(status, payload) {
  return {
    status,
    async json() {
      return payload;
    }
  };
}

async function assertRejeitaComCodigo(promessa, code) {
  await assert.rejects(promessa, erro => {
    assert.equal(erro.code, code);
    return true;
  });
}

test('feature flag ausente ou desligada deixa busca nao configurada', () => {
  assert.deepEqual(validarConfiguracaoPetlove({}), { configurada: false });
  assert.deepEqual(
    validarConfiguracaoPetlove(entradaConfigurada({ buscaHabilitada: 'false' })),
    { configurada: false }
  );
});

test('configuracao habilitada exige base HTTPS e cookie', () => {
  assert.deepEqual(
    validarConfiguracaoPetlove(entradaConfigurada({ baseUrl: '' })),
    { configurada: false }
  );
  assert.deepEqual(
    validarConfiguracaoPetlove(entradaConfigurada({ baseUrl: 'http://petlove.invalid' })),
    { configurada: false }
  );
  assert.deepEqual(
    validarConfiguracaoPetlove(entradaConfigurada({ authCookie: '' })),
    { configurada: false }
  );
});

test('timeout usa padrao seguro e rejeita valor fora do intervalo', () => {
  assert.equal(validarConfiguracaoPetlove(entradaConfigurada()).timeoutMs, TIMEOUT_PADRAO_MS);
  assert.equal(
    validarConfiguracaoPetlove(entradaConfigurada({ timeoutMs: '1000' })).timeoutMs,
    1000
  );
  assert.deepEqual(
    validarConfiguracaoPetlove(entradaConfigurada({ timeoutMs: '999' })),
    { configurada: false }
  );
  assert.deepEqual(
    validarConfiguracaoPetlove(entradaConfigurada({ timeoutMs: '15001' })),
    { configurada: false }
  );
});

test('client usa URL codificada e envia cookie somente no transporte backend', async () => {
  const configuracao = validarConfiguracaoPetlove(entradaConfigurada());
  let chamada;
  const transporte = async (url, opcoes) => {
    chamada = { url, opcoes };
    return resposta(200, pacienteBruto());
  };
  const client = criarClientPetlove({ configuracao, transporte });

  const payload = await client.buscarPorMicrochip(' CHIP/FAKE ');

  assert.equal(chamada.url, 'https://petlove.invalid/api/atendimento/%20CHIP%2FFAKE%20');
  assert.equal(chamada.opcoes.method, 'GET');
  assert.equal(chamada.opcoes.headers.Cookie, 'sessao=ficticia');
  assert.equal(chamada.opcoes.headers.Accept, 'application/json');
  assert.deepEqual(payload, pacienteBruto());
});

test('client converte 401 e 403 em erro controlado', async () => {
  const configuracao = validarConfiguracaoPetlove(entradaConfigurada());

  for (const status of [401, 403]) {
    const client = criarClientPetlove({
      configuracao,
      transporte: async () => resposta(status)
    });
    await assertRejeitaComCodigo(
      client.buscarPorMicrochip('CHIP-FAKE-001'),
      CODIGOS_ERRO_CLIENT.NAO_AUTORIZADA
    );
  }
});

test('client converte 404 em paciente nao encontrado', async () => {
  const client = criarClientPetlove({
    configuracao: validarConfiguracaoPetlove(entradaConfigurada()),
    transporte: async () => resposta(404)
  });

  await assertRejeitaComCodigo(
    client.buscarPorMicrochip('CHIP-FAKE-001'),
    CODIGOS_ERRO_CLIENT.NAO_ENCONTRADO
  );
});

test('client converte 429 e 500 em indisponibilidade temporaria', async () => {
  const configuracao = validarConfiguracaoPetlove(entradaConfigurada());

  for (const status of [429, 500]) {
    const client = criarClientPetlove({
      configuracao,
      transporte: async () => resposta(status)
    });
    await assertRejeitaComCodigo(
      client.buscarPorMicrochip('CHIP-FAKE-001'),
      CODIGOS_ERRO_CLIENT.INDISPONIVEL
    );
  }
});

test('client converte AbortError em indisponibilidade temporaria', async () => {
  const client = criarClientPetlove({
    configuracao: validarConfiguracaoPetlove(entradaConfigurada()),
    transporte: async () => {
      const erro = new Error('tempo excedido');
      erro.name = 'AbortError';
      throw erro;
    }
  });

  await assertRejeitaComCodigo(
    client.buscarPorMicrochip('CHIP-FAKE-001'),
    CODIGOS_ERRO_CLIENT.INDISPONIVEL
  );
});

test('client converte JSON invalido em erro seguro', async () => {
  const client = criarClientPetlove({
    configuracao: validarConfiguracaoPetlove(entradaConfigurada()),
    transporte: async () => ({
      status: 200,
      async json() {
        throw new SyntaxError('conteudo bruto sigiloso');
      }
    })
  });

  await assertRejeitaComCodigo(
    client.buscarPorMicrochip('CHIP-FAKE-001'),
    CODIGOS_ERRO_CLIENT.RESPOSTA_INVALIDA
  );
});

test('service sem configuracao mantem PETLOVE_NAO_CONFIGURADA', async () => {
  const servico = criarServicoConsulta({
    obterConfiguracao: () => ({ configurada: false })
  });

  await assertRejeitaComCodigo(
    servico.buscarPorMicrochip('CHIP-FAKE-001'),
    ERRO_PETLOVE_NAO_CONFIGURADA.code
  );
});

test('service configurado normaliza payload sem expor campo tecnico', async () => {
  const configuracao = validarConfiguracaoPetlove(entradaConfigurada());
  const transporte = async () => resposta(200, pacienteBruto({ id: 987 }));
  const servico = criarServicoConsulta({
    obterConfiguracao: () => configuracao,
    criarClient: opcoes => criarClientPetlove({ ...opcoes, transporte })
  });

  const paciente = await servico.buscarPorMicrochip('CHIP-FAKE-001');

  assert.equal(paciente.nome_animal, 'Animal Ficticio');
  assert.equal(paciente.microchip, 'CHIP-FAKE-001');
  assert.equal(Object.prototype.hasOwnProperty.call(paciente, 'petlove_id'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(paciente, 'id'), false);
});

test('payload Petlove invalido vira erro seguro sem resposta bruta', async () => {
  const payloadSigiloso = {
    detalhe_interno: 'NAO_VAZAR',
    auth: 'sessao-ficticia'
  };
  const servico = criarServicoConsulta({
    obterConfiguracao: () => validarConfiguracaoPetlove(entradaConfigurada()),
    criarClient: () => ({
      buscarPorMicrochip: async () => payloadSigiloso
    })
  });

  await assert.rejects(servico.buscarPorMicrochip('CHIP-FAKE-001'), erro => {
    assert.equal(erro.code, CODIGOS_ERRO_CLIENT.RESPOSTA_INVALIDA);
    assert.equal(erro.message, 'Resposta Petlove invalida');
    assert.equal(JSON.stringify(erro).includes('NAO_VAZAR'), false);
    return true;
  });
});
