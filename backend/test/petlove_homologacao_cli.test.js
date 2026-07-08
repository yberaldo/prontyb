'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const cli = require('../scripts/petlove_homologacao_cli.js');
const { normalizarPacientePetlove } = require('../src/servicos/petlove_normalizador.servico.js');

function executarMainCliComServicoSintetico(corpoServico) {
  const caminhoCli = require.resolve('../scripts/petlove_homologacao_cli.js');
  const script = `
    const Module = require('node:module');
    const carregarOriginal = Module._load;
    globalThis.fetch = async () => {
      throw new Error('TRANSPORTE_REAL_BLOQUEADO_NO_TESTE');
    };
    Module._load = function (request, parent, isMain) {
      if (String(request).includes('petlove_consulta.servico')) {
        return {
          buscarPorMicrochip: async () => {
            ${corpoServico}
          },
        };
      }
      return carregarOriginal.call(this, request, parent, isMain);
    };
    require(${JSON.stringify(caminhoCli)}).main();
  `;

  return new Promise((resolve, reject) => {
    const processo = spawn(process.execPath, ['-e', script], {
      env: {
        ...process.env,
        PETLOVE_AUTHORIZATION: 'Bearer TESTE_AUTORIZACAO_SINTETICA_NAO_VAZAR',
        PETLOVE_AUTH_COOKIE: 'sessao_petlove_sintetica_nao_vazar=abc',
        PETLOVE_AUTHORIZATION_FILE: '',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let etapaEntrada = 0;
    const temporizador = setTimeout(() => {
      processo.kill();
      reject(new Error('timeout aguardando CLI sintetico'));
    }, 5000);

    processo.stdout.setEncoding('utf8');
    processo.stderr.setEncoding('utf8');
    processo.stdout.on('data', (trecho) => {
      stdout += trecho;
      if (etapaEntrada === 0 && trecho.includes('PETLOVE_BASE_URL')) {
        etapaEntrada = 1;
        processo.stdin.write('https://petlove.invalid\n');
      } else if (etapaEntrada === 1 && trecho.includes('Microchip para teste')) {
        etapaEntrada = 2;
        processo.stdin.write('CHIP-FAKE-001\n');
      } else if (etapaEntrada === 2) {
        etapaEntrada = 3;
        processo.stdin.end('\n');
      }
    });
    processo.stderr.on('data', (trecho) => {
      stderr += trecho;
    });
    processo.on('error', (error) => {
      clearTimeout(temporizador);
      reject(error);
    });
    processo.on('close', (status, signal) => {
      clearTimeout(temporizador);
      resolve({
        error: undefined,
        signal,
        status,
        stderr,
        stdout,
      });
    });
  });
}

function assertCredenciaisAusentesDaSaida(resultado) {
  const saida = `${resultado.stdout}\n${resultado.stderr}`;
  assert.equal(saida.includes('TESTE_AUTORIZACAO_SINTETICA_NAO_VAZAR'), false);
  assert.equal(saida.includes('sessao_petlove_sintetica_nao_vazar'), false);
  assert.equal(saida.includes('Bearer TESTE_AUTORIZACAO_SINTETICA_NAO_VAZAR'), false);
}

test('main do CLI nao imprime Authorization ou Cookie no sucesso', async () => {
  const resultado = await executarMainCliComServicoSintetico(`
    return {
      especie: 'canina',
      sexo: 'femea',
      peso_kg: 2.5,
      nome_animal: 'Animal Ficticio',
      nome_tutor: 'Tutora Ficticia',
      data_nascimento: '2018-05-04',
      microchip: 'CHIP-FAKE-001',
    };
  `);

  assert.equal(resultado.error, undefined);
  assert.equal(resultado.status, 0);
  assert.match(resultado.stdout, /"ok": true/);
  assertCredenciaisAusentesDaSaida(resultado);
});

test('main do CLI nao imprime Authorization ou Cookie no erro', async () => {
  const resultado = await executarMainCliComServicoSintetico(`
    const erro = new Error(
      'Authorization=Bearer TESTE_AUTORIZACAO_SINTETICA_NAO_VAZAR; '
      + 'Cookie=sessao_petlove_sintetica_nao_vazar=abc'
    );
    erro.code = 'PETLOVE_RESPOSTA_INVALIDA';
    throw erro;
  `);

  assert.equal(resultado.error, undefined);
  assert.match(`${resultado.stdout}\n${resultado.stderr}`, /"ok": false/);
  assertCredenciaisAusentesDaSaida(resultado);
});

test('base url vazia usa o padrao da Central Petlove', () => {
  assert.equal(
    cli.validarBaseUrlPetlove(''),
    cli.DEFAULT_PETLOVE_BASE_URL,
  );
});

test('base url com fragmento continua rejeitada', () => {
  assert.throws(() => {
    cli.validarBaseUrlPetlove('https://central-de-saude.petlove.com.br/#/login');
  }, /fragmento/i);
});

test('base url com query continua rejeitada', () => {
  assert.throws(() => {
    cli.validarBaseUrlPetlove('https://central-de-saude.petlove.com.br/?a=1');
  }, /query/i);
});

test('base url com credenciais continua rejeitada', () => {
  assert.throws(() => {
    cli.validarBaseUrlPetlove('https://usuario:senha@central-de-saude.petlove.com.br');
  }, /credenciais/i);
});

test('base url http continua rejeitada', () => {
  assert.throws(() => {
    cli.validarBaseUrlPetlove('http://central-de-saude.petlove.com.br');
  }, /https/i);
});

test('CLI usa PETLOVE_AUTHORIZATION do ambiente sem perguntar segredo', async () => {
  let perguntou = false;
  const credenciais = await cli.obterCredenciaisParaCli({
    env: { PETLOVE_AUTHORIZATION: ' Bearer TESTE_AUTORIZACAO_SINTETICA ' },
    perguntarOcultoFn: async () => {
      perguntou = true;
      return 'nao-usar';
    },
  });

  assert.deepEqual(credenciais, {
    authorization: 'Bearer TESTE_AUTORIZACAO_SINTETICA',
    authorizationOrigem: 'env',
    authCookie: null,
    authCookieOrigem: null,
  });
  assert.equal(perguntou, false);
  assert.equal(JSON.stringify(cli.montarResumoErroSanitizado(new Error('falha'))).includes('TESTE_AUTORIZACAO_SINTETICA'), false);
});

test('CLI aceita PETLOVE_AUTHORIZATION_FILE do ambiente sem perguntar segredo', async () => {
  let perguntou = false;
  const credenciais = await cli.obterCredenciaisParaCli({
    env: { PETLOVE_AUTHORIZATION_FILE: '/etc/prontyb/petlove.authorization' },
    fsImpl: {
      readFileSync(caminho, codificacao) {
        assert.equal(caminho, '/etc/prontyb/petlove.authorization');
        assert.equal(codificacao, 'utf8');
        return ' Bearer TESTE_ARQUIVO_SINTETICO\n';
      },
    },
    perguntarOcultoFn: async () => {
      perguntou = true;
      return 'nao-usar';
    },
  });

  assert.deepEqual(credenciais, {
    authorization: 'Bearer TESTE_ARQUIVO_SINTETICO',
    authorizationOrigem: 'arquivo',
    authCookie: null,
    authCookieOrigem: null,
  });
  assert.equal(perguntou, false);
});

test('CLI rejeita PETLOVE_AUTHORIZATION_FILE ilegivel sem vazar caminho', async () => {
  const caminhoSensivel = '/segredo/TESTE_CAMINHO_NAO_VAZAR';

  await assert.rejects(
    cli.obterCredenciaisParaCli({
      env: { PETLOVE_AUTHORIZATION_FILE: caminhoSensivel },
      fsImpl: {
        readFileSync() {
          throw new Error(`arquivo ausente: ${caminhoSensivel}`);
        },
      },
    }),
    (erro) => {
      assert.equal(erro.codigo, 'VALIDACAO_LOCAL');
      assert.equal(erro.message, 'PETLOVE_AUTHORIZATION_FILE invalido ou ilegivel.');
      assert.equal(JSON.stringify(cli.montarResumoErroSanitizado(erro)).includes(caminhoSensivel), false);
      assert.equal(Object.prototype.hasOwnProperty.call(erro, 'stackBruta'), false);
      return true;
    },
  );
});

test('CLI rejeita PETLOVE_AUTHORIZATION_FILE vazio de forma sanitizada', async () => {
  await assert.rejects(
    cli.obterCredenciaisParaCli({
      env: { PETLOVE_AUTHORIZATION_FILE: '/arquivo/sintetico' },
      fsImpl: {
        readFileSync() {
          return ' \n\t ';
        },
      },
    }),
    (erro) => {
      assert.equal(erro.codigo, 'VALIDACAO_LOCAL');
      assert.equal(erro.message, 'PETLOVE_AUTHORIZATION_FILE invalido ou ilegivel.');
      return true;
    },
  );
});

test('CLI permite Authorization vazio quando Cookie existe no ambiente', async () => {
  const perguntas = [];
  const credenciais = await cli.obterCredenciaisParaCli({
    env: { PETLOVE_AUTH_COOKIE: ' sessao=ficticia ' },
    perguntarOcultoFn: async () => {
      perguntas.push('authorization');
      return '';
    },
  });

  assert.deepEqual(credenciais, {
    authorization: null,
    authorizationOrigem: null,
    authCookie: 'sessao=ficticia',
    authCookieOrigem: 'env',
  });
  assert.deepEqual(perguntas, ['authorization']);
});

test('CLI permite Cookie vazio quando Authorization foi informado', async () => {
  const respostas = [' Bearer TESTE_AUTORIZACAO_SINTETICA ', ''];
  const credenciais = await cli.obterCredenciaisParaCli({
    env: {},
    perguntarOcultoFn: async () => respostas.shift(),
  });

  assert.deepEqual(credenciais, {
    authorization: 'Bearer TESTE_AUTORIZACAO_SINTETICA',
    authorizationOrigem: 'entrada',
    authCookie: null,
    authCookieOrigem: null,
  });
});

test('CLI exige pelo menos Authorization ou Cookie', async () => {
  const respostas = ['', ''];

  await assert.rejects(
    cli.obterCredenciaisParaCli({
      env: {},
      perguntarOcultoFn: async () => respostas.shift(),
    }),
    (erro) => {
      assert.equal(erro.codigo, 'VALIDACAO_LOCAL');
      assert.equal(erro.message, 'PETLOVE_AUTHORIZATION ou PETLOVE_AUTH_COOKIE obrigatorio.');
      return true;
    },
  );
});

test('resumo sanitizado nao vaza cookie, microchip completo nem petlove_id', () => {
  const resumo = cli.montarResumoSucesso('123456789012345', {
    especie: 'canina',
    sexo: 'F',
    peso: 12.4,
    nome_animal: 'Luna',
    tutor: 'Nome Completo do Tutor',
    data_nascimento: '2020-01-02',
    petlove_id: '123456',
    cookie: 'segredo',
    authorization: 'Bearer secreto',
    resposta: { bruta: true },
  });

  const texto = JSON.stringify(resumo);

  assert.equal(resumo.ok, true);
  assert.equal(resumo.microchip_mascarado.includes('123456789012345'), false);
  assert.equal(texto.includes('segredo'), false);
  assert.equal(texto.includes('123456789012345'), false);
  assert.equal(texto.includes('petlove_id'), false);
  assert.equal(texto.includes('Tutor'), false);
  assert.equal(texto.includes('2020-01-02'), false);
  assert.equal(texto.includes('Bearer'), false);
  assert.equal(texto.includes('Authorization'), false);
  assert.equal(texto.includes('cookie'), false);
});

test('erro controlado PETLOVE_RESPOSTA_INVALIDA vira JSON seguro no CLI', () => {
  const erro = Object.assign(new Error('Resposta Petlove invalida'), {
    code: 'PETLOVE_RESPOSTA_INVALIDA',
    payload: {
      bruto: true,
      cookie: 'sessao=ficticia',
      microchip: '123456789012345',
    },
  });
  const resumo = cli.montarResumoErroSanitizado(erro);
  const texto = JSON.stringify(resumo);

  assert.deepEqual(resumo, {
    ok: false,
    codigo: 'PETLOVE_RESPOSTA_INVALIDA',
    mensagem: 'Resposta Petlove invalida',
  });
  assert.equal(texto.includes('stack'), false);
  assert.equal(texto.includes('payload'), false);
  assert.equal(texto.includes('bruto'), false);
  assert.equal(texto.includes('sessao=ficticia'), false);
  assert.equal(texto.includes('123456789012345'), false);
});

test('BAD_REQUEST de normalizacao nao vira erro inesperado nem vaza mensagem sensivel', () => {
  const erro = Object.assign(
    new Error('Resposta Petlove invalida com cookie=abc e microchip=123456789012345'),
    { code: 'BAD_REQUEST' },
  );
  const resumo = cli.montarResumoErroSanitizado(erro);
  const texto = JSON.stringify(resumo);

  assert.equal(resumo.ok, false);
  assert.equal(resumo.codigo, 'PETLOVE_RESPOSTA_INVALIDA');
  assert.equal(resumo.mensagem, 'Resposta Petlove invalida');
  assert.equal(texto.includes('PETLOVE_ERRO_INESPERADO'), false);
  assert.equal(texto.includes('cookie=abc'), false);
  assert.equal(texto.includes('123456789012345'), false);
});

test('erro inesperado real continua opaco e sanitizado', () => {
  const resumo = cli.montarResumoErroSanitizado(
    new Error('segredo bruto com cookie=abc e microchip=123456789012345'),
  );
  const texto = JSON.stringify(resumo);

  assert.deepEqual(resumo, {
    ok: false,
    codigo: 'PETLOVE_ERRO_INESPERADO',
    mensagem: 'Erro inesperado sanitizado',
  });
  assert.equal(texto.includes('stack'), false);
  assert.equal(texto.includes('segredo bruto'), false);
  assert.equal(texto.includes('cookie=abc'), false);
  assert.equal(texto.includes('123456789012345'), false);
});

test('CLI resume paciente normalizado a partir de resposta upstream embrulhada', async () => {
  const payloadUpstream = {
    buscarPorMicrochip: {
      name: 'Animal Ficticio',
      microchip: 'CHIP-FAKE-001',
      race: {
        name: 'SRD',
        specie: { name: 'Cachorro' },
      },
      sex: 'Fêmea',
      birthday: '2018-05-04',
      user_name: 'Tutora Ficticia',
      userPetWeightHistoric: [
        { weight: '2.5', created_at: '2024-01-01T10:00:00.000Z' },
      ],
    },
  };
  const chamadas = [];
  const consulta = cli.carregarServicoConsultaPetlove({
    criarServicoConsulta() {
      chamadas.push('factory');
      return {
        buscarPorMicrochip: async () => payloadUpstream,
      };
    },
    buscarPorMicrochip: async (microchip) => {
      chamadas.push(`buscar:${microchip}`);
      return normalizarPacientePetlove(payloadUpstream);
    },
  });

  const paciente = await cli.executarConsultaPetlove(consulta, 'CHIP-FAKE-001');
  const resumo = cli.montarResumoSucesso('CHIP-FAKE-001', paciente);
  const texto = JSON.stringify(resumo);

  assert.deepEqual(chamadas, ['buscar:CHIP-FAKE-001']);
  assert.equal(resumo.ok, true);
  assert.equal(resumo.especie, 'canina');
  assert.equal(resumo.sexo, 'femea');
  assert.equal(resumo.peso_presente, true);
  assert.equal(resumo.nome_animal_presente, true);
  assert.equal(resumo.tutor_presente, true);
  assert.equal(resumo.nascimento_presente, true);
  assert.equal(resumo.microchip_mascarado.startsWith('CHI'), true);
  assert.equal(resumo.microchip_mascarado.endsWith('01'), true);
  assert.equal(resumo.microchip_mascarado.includes('*'), true);
  assert.equal(resumo.campos_normalizados.includes('buscarPorMicrochip'), false);
  assert.equal(texto.includes('cookie'), false);
  assert.equal(texto.includes('token'), false);
  assert.equal(texto.includes('Authorization'), false);
  assert.equal(texto.includes('CHIP-FAKE-001'), false);
  assert.equal(texto.includes('Tutora Ficticia'), false);
  assert.equal(texto.includes('telefone'), false);
  assert.equal(texto.includes('petlove_id'), false);
  assert.equal(texto.includes('buscarPorMicrochip'), false);
  assert.equal(texto.includes('userPetWeightHistoric'), false);
});

test('mascara microchip sem expor o valor completo', () => {
  const mascarado = cli.mascararMicrochip('123456789012345');

  assert.equal(mascarado.startsWith('123'), true);
  assert.equal(mascarado.endsWith('45'), true);
  assert.equal(mascarado.includes('123456789012345'), false);
});
