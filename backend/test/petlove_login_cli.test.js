'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cli = require('../scripts/petlove_login_cli.js');

function resposta(status, payload) {
  return {
    status,
    async json() {
      return payload;
    },
  };
}

async function executarMainCapturandoSaida(opcoes = {}) {
  let stdoutTexto = '';
  let stderrTexto = '';
  const stderrOriginal = process.stderr.write;

  process.stderr.write = function escreverStderr(chunk, encoding, callback) {
    stderrTexto += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');
    if (typeof callback === 'function') {
      callback();
    }
    return true;
  };

  try {
    const exitCode = await cli.main({
      stdinImpl: { isTTY: false },
      stdoutImpl: {
        isTTY: false,
        write(chunk) {
          stdoutTexto += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');
          return true;
        },
      },
      ...opcoes,
    });

    return { exitCode, stdoutTexto, stderrTexto };
  } finally {
    process.stderr.write = stderrOriginal;
  }
}

test('autenticarPetlove retorna Authorization pronto quando login responde 200', async () => {
  const chamadas = [];
  const resultado = await cli.autenticarPetlove({
    baseUrl: 'https://central-de-saude.petlove.com.br',
    email: 'teste@example.com',
    senha: 'senha-segura',
    fetchImpl: async (url, opcoes) => {
      chamadas.push({ url, opcoes });
      return resposta(200, {
        token_type: 'Bearer',
        access_token: 'TOKEN_SINTETICO',
        expires_in: 3600,
      });
    },
  });

  assert.equal(chamadas[0].url, 'https://central-de-saude.petlove.com.br/api/login/local');
  assert.deepEqual(chamadas[0].opcoes.headers, {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: 'https://central-de-saude.petlove.com.br',
    Referer: 'https://central-de-saude.petlove.com.br/',
    'X-Requested-With': 'XMLHttpRequest',
  });
  assert.deepEqual(JSON.parse(chamadas[0].opcoes.body), {
    username: 'teste@example.com',
    password: 'senha-segura',
    clinic_id: null,
  });
  assert.equal(resultado.authorization, 'Bearer TOKEN_SINTETICO');
  assert.equal(resultado.expiresIn, 3600);
});

test('autenticarComSelecaoClinica repete login com clinic_id quando backend responde 202', async () => {
  const corpos = [];
  const resultado = await cli.autenticarComSelecaoClinica({
    baseUrl: 'https://central-de-saude.petlove.com.br',
    email: 'teste@example.com',
    senha: 'senha-segura',
    perguntarFn: async (prompt) => {
      assert.match(prompt, /clinic_id/i);
      return '77';
    },
    fetchImpl: async (_url, opcoes) => {
      corpos.push(JSON.parse(opcoes.body));
      if (corpos.length === 1) {
        return resposta(202, [
          { clinic_id: 77, name: 'Clinica Alpha' },
          { clinic_id: 88, name: 'Clinica Beta' },
        ]);
      }

      return resposta(200, {
        token_type: 'Bearer',
        access_token: 'TOKEN_COM_CLINICA',
        expires_in: 7200,
      });
    },
  });

  assert.deepEqual(corpos, [
    {
      username: 'teste@example.com',
      password: 'senha-segura',
      clinic_id: null,
    },
    {
      username: 'teste@example.com',
      password: 'senha-segura',
      clinic_id: '77',
    },
  ]);
  assert.equal(resultado.authorization, 'Bearer TOKEN_COM_CLINICA');
  assert.equal(resultado.clinicId, '77');
});

test('obterLoginPetlove prefere PETLOVE_LOGIN_USERNAME e mantem compatibilidade com PETLOVE_LOGIN_EMAIL', () => {
  assert.equal(
    cli.obterLoginPetlove({
      PETLOVE_LOGIN_USERNAME: ' usuario@exemplo.com ',
      PETLOVE_LOGIN_EMAIL: 'email@exemplo.com',
    }),
    'usuario@exemplo.com',
  );

  assert.equal(
    cli.obterLoginPetlove({
      PETLOVE_LOGIN_EMAIL: ' email@exemplo.com ',
    }),
    'email@exemplo.com',
  );
});

test('validarBaseUrlPetloveLogin aceita somente a raiz oficial da Petlove', () => {
  assert.equal(
    cli.validarBaseUrlPetloveLogin(''),
    'https://central-de-saude.petlove.com.br',
  );
  assert.equal(
    cli.validarBaseUrlPetloveLogin('https://central-de-saude.petlove.com.br'),
    'https://central-de-saude.petlove.com.br',
  );

  for (const entrada of [
    'https://evil.example',
    'http://central-de-saude.petlove.com.br',
    'https://central-de-saude.petlove.com.br:443',
    'https://central-de-saude.petlove.com.br:8443',
    'https://central-de-saude.petlove.com.br/abc',
    'https://central-de-saude.petlove.com.br?x=1',
    'https://central-de-saude.petlove.com.br#x',
    'https://user:pass@central-de-saude.petlove.com.br',
  ]) {
    assert.throws(() => {
      cli.validarBaseUrlPetloveLogin(entrada);
    }, /PETLOVE_BASE_URL|central-de-saude\.petlove\.com\.br/i);
  }
});

test('main rejeita senha por prompt em ambiente nao-TTY sem chamar prompt oculto', async () => {
  let chamadaSenha = false;
  const resultado = await executarMainCapturandoSaida({
    env: {
      PETLOVE_BASE_URL: 'https://central-de-saude.petlove.com.br',
      PETLOVE_LOGIN_EMAIL: 'teste@example.com',
      PETLOVE_AUTHORIZATION_FILE: '/tmp/petlove.authorization',
    },
    perguntarSenhaOcultaFn: async () => {
      chamadaSenha = true;
      return 'senha-nao-deveria-ser-usada';
    },
    fetchImpl: async () => {
      throw new Error('fetch nao deveria ser chamado');
    },
    fsImpl: {
      mkdirSync() {
        throw new Error('fs nao deveria ser chamado');
      },
      writeFileSync() {
        throw new Error('fs nao deveria ser chamado');
      },
      chmodSync() {
        throw new Error('fs nao deveria ser chamado');
      },
    },
  });

  assert.equal(resultado.exitCode, 1);
  assert.equal(chamadaSenha, false);
  assert.match(resultado.stdoutTexto, /Senha Petlove requer terminal interativo\./);
  assert.equal(resultado.stdoutTexto.includes('senha-nao-deveria-ser-usada'), false);
  assert.equal(resultado.stderrTexto.includes('senha-nao-deveria-ser-usada'), false);
});

test('main usa prompt Login/E-mail Petlove quando login nao vem por ambiente', async () => {
  let promptCapturado = '';
  const resultado = await cli.main({
    env: {
      PETLOVE_BASE_URL: 'https://central-de-saude.petlove.com.br',
      PETLOVE_LOGIN_PASSWORD: 'senha-sintetica-nao-vazar',
      PETLOVE_AUTHORIZATION_FILE: '/tmp/petlove.authorization',
    },
    perguntarFn: async (prompt) => {
      promptCapturado = prompt;
      return 'login@exemplo.com';
    },
    perguntarSenhaOcultaFn: async () => 'nao-usar',
    fetchImpl: async () => resposta(200, {
      token_type: 'Bearer',
      access_token: 'TOKEN_SINTETICO',
      expires_in: 3600,
    }),
    fsImpl: {
      mkdirSync() {},
      writeFileSync() {},
      chmodSync() {},
    },
    stdinImpl: { isTTY: false },
    stdoutImpl: { isTTY: false, write() {} },
  });

  assert.equal(resultado, 0);
  assert.match(promptCapturado, /Login\/E-mail Petlove:/);
});

test('main nao vaza senha em stdout ou stderr no sucesso', async () => {
  const resultado = await executarMainCapturandoSaida({
    env: {
      PETLOVE_BASE_URL: 'https://central-de-saude.petlove.com.br',
      PETLOVE_LOGIN_EMAIL: 'teste@example.com',
      PETLOVE_LOGIN_PASSWORD: 'senha-sintetica-nao-vazar',
      PETLOVE_AUTHORIZATION_FILE: '/tmp/petlove.authorization',
    },
    fetchImpl: async () => resposta(200, {
      token_type: 'Bearer',
      access_token: 'TOKEN_SINTETICO',
      expires_in: 3600,
    }),
    fsImpl: {
      mkdirSync() {},
      writeFileSync() {},
      chmodSync() {},
    },
  });

  assert.equal(resultado.exitCode, 0);
  assert.match(resultado.stdoutTexto, /"ok": true/);
  assert.equal(resultado.stdoutTexto.includes('senha-sintetica-nao-vazar'), false);
  assert.equal(resultado.stderrTexto.includes('senha-sintetica-nao-vazar'), false);
});

test('main nao vaza senha em stdout ou stderr no erro', async () => {
  const resultado = await executarMainCapturandoSaida({
    env: {
      PETLOVE_BASE_URL: 'https://central-de-saude.petlove.com.br',
      PETLOVE_LOGIN_EMAIL: 'teste@example.com',
      PETLOVE_LOGIN_PASSWORD: 'senha-sintetica-nao-vazar',
      PETLOVE_AUTHORIZATION_FILE: '/tmp/petlove.authorization',
    },
    fetchImpl: async () => resposta(401, { message: 'Unauthorized' }),
    fsImpl: {
      mkdirSync() {},
      writeFileSync() {},
      chmodSync() {},
    },
  });

  assert.equal(resultado.exitCode, 3);
  assert.match(resultado.stdoutTexto, /"ok": false/);
  assert.equal(resultado.stdoutTexto.includes('senha-sintetica-nao-vazar'), false);
  assert.equal(resultado.stderrTexto.includes('senha-sintetica-nao-vazar'), false);
});

test('main reporta status HTTP no erro 401 sem vazar body bruto', async () => {
  const resultado = await executarMainCapturandoSaida({
    env: {
      PETLOVE_BASE_URL: 'https://central-de-saude.petlove.com.br',
      PETLOVE_LOGIN_EMAIL: 'teste@example.com',
      PETLOVE_LOGIN_PASSWORD: 'senha-sintetica-nao-vazar',
      PETLOVE_AUTHORIZATION_FILE: '/tmp/petlove.authorization',
    },
    fetchImpl: async () => resposta(401, { message: 'Unauthorized', token: 'TOKEN_NAO_VAZAR' }),
    fsImpl: {
      mkdirSync() {},
      writeFileSync() {},
      chmodSync() {},
    },
  });

  assert.equal(resultado.exitCode, 3);
  assert.match(resultado.stdoutTexto, /"codigo": "PETLOVE_NAO_AUTORIZADA"/);
  assert.match(resultado.stdoutTexto, /"status_http": 401/);
  assert.equal(resultado.stdoutTexto.includes('Unauthorized'), false);
  assert.equal(resultado.stdoutTexto.includes('TOKEN_NAO_VAZAR'), false);
});

test('autenticarPetlove sanitiza 401 como credencial invalida', async () => {
  await assert.rejects(
    cli.autenticarPetlove({
      baseUrl: 'https://central-de-saude.petlove.com.br',
      email: 'teste@example.com',
      senha: 'senha-segura',
      fetchImpl: async () => resposta(401, { message: 'Unauthorized' }),
    }),
    (erro) => {
      assert.equal(erro.codigo, 'PETLOVE_NAO_AUTORIZADA');
      assert.equal(erro.message, 'Credenciais Petlove invalidas.');
      assert.equal(erro.statusHttp, 401);
      return true;
    },
  );
});

test('salvarAuthorizationEmArquivo grava segredo com quebra de linha e permissao restrita', (t) => {
  const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), 'prontyb-petlove-login-'));
  t.after(() => fs.rmSync(diretorio, { recursive: true, force: true }));
  const arquivo = path.join(diretorio, 'petlove.authorization');

  const caminhoSalvo = cli.salvarAuthorizationEmArquivo(arquivo.replace(/\\/g, '/'), 'Bearer TOKEN_SINTETICO');

  assert.equal(path.basename(caminhoSalvo), 'petlove.authorization');
  assert.equal(fs.readFileSync(arquivo, 'utf8'), 'Bearer TOKEN_SINTETICO\n');
});
