'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { stdin, stdout } = require('node:process');

const {
  DEFAULT_PETLOVE_BASE_URL,
  perguntar,
} = require('./petlove_homologacao_cli.js');

const DEFAULT_AUTHORIZATION_FILE = '/etc/prontyb/petlove.authorization';
const DEFAULT_LOGIN_BASE_URL = DEFAULT_PETLOVE_BASE_URL;

function criarErroSanitizado(codigo, mensagem, exitCode) {
  const erro = new Error(mensagem);
  erro.codigo = codigo;
  erro.exitCode = exitCode;
  return erro;
}

function textoSeguro(valor) {
  return String(valor ?? '').trim();
}

function normalizarClinicId(valor) {
  const texto = textoSeguro(valor);
  return texto || null;
}

function validarEmail(valor) {
  const texto = textoSeguro(valor);

  if (!texto) {
    throw criarErroSanitizado('VALIDACAO_LOCAL', 'E-mail Petlove obrigatorio.', 1);
  }

  if (!texto.includes('@')) {
    throw criarErroSanitizado('VALIDACAO_LOCAL', 'E-mail Petlove invalido.', 1);
  }

  return texto;
}

function validarSenha(valor) {
  const texto = textoSeguro(valor);

  if (!texto) {
    throw criarErroSanitizado('VALIDACAO_LOCAL', 'Senha Petlove obrigatoria.', 1);
  }

  return texto;
}

function validarBaseUrlPetloveLogin(valor) {
  const texto = textoSeguro(valor) || DEFAULT_LOGIN_BASE_URL;
  const possuiPortaExplicita = /^https:\/\/central-de-saude\.petlove\.com\.br:(\d+)(?:[/?#]|$)/i.test(texto);

  let url;

  try {
    url = new URL(texto);
  } catch (_) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'PETLOVE_BASE_URL invalida. Use apenas https://central-de-saude.petlove.com.br.',
      1,
    );
  }

  if (
    url.protocol !== 'https:'
    || url.hostname !== 'central-de-saude.petlove.com.br'
    || url.username
    || url.password
    || possuiPortaExplicita
    || url.port
    || (url.pathname && url.pathname !== '/')
    || url.search
    || url.hash
  ) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'PETLOVE_BASE_URL deve ser exatamente https://central-de-saude.petlove.com.br.',
      1,
    );
  }

  return DEFAULT_LOGIN_BASE_URL;
}

function validarCaminhoAuthorizationFile(valor) {
  const texto = textoSeguro(valor) || DEFAULT_AUTHORIZATION_FILE;
  const resolvido = path.normalize(texto);

  if (!path.isAbsolute(resolvido)) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'PETLOVE_AUTHORIZATION_FILE deve ser um caminho absoluto.',
      1,
    );
  }

  return resolvido;
}

function montarAuthorization(payload) {
  const tokenType = textoSeguro(payload?.token_type || 'Bearer');
  const accessToken = textoSeguro(payload?.access_token);

  if (!accessToken) {
    throw criarErroSanitizado(
      'PETLOVE_RESPOSTA_INVALIDA',
      'Resposta de login Petlove sem access_token.',
      5,
    );
  }

  return `${tokenType} ${accessToken}`.trim();
}

function perguntarSenhaOculta(texto, stdinImpl = stdin, stdoutImpl = stdout) {
  if (!stdinImpl?.isTTY || !stdoutImpl?.isTTY || typeof stdinImpl.setRawMode !== 'function') {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'Senha Petlove requer terminal interativo.',
      1,
    );
  }

  return new Promise((resolve, reject) => {
    let valor = '';
    let finalizado = false;

    const limpar = () => {
      stdinImpl.off('data', aoReceberDado);
      stdinImpl.pause();
      stdinImpl.setRawMode(false);
    };

    const finalizar = () => {
      if (finalizado) {
        return;
      }

      finalizado = true;
      limpar();
      stdoutImpl.write('\n');
      resolve(valor);
    };

    const abortar = () => {
      if (finalizado) {
        return;
      }

      finalizado = true;
      limpar();
      stdoutImpl.write('\n');
      reject(criarErroSanitizado('VALIDACAO_LOCAL', 'Entrada interrompida.', 1));
    };

    const aoReceberDado = (buffer) => {
      const entrada = buffer.toString('utf8');

      for (const caractere of entrada) {
        if (caractere === '\r' || caractere === '\n') {
          finalizar();
          return;
        }

        if (caractere === '\u0003' || caractere === '\u0004') {
          abortar();
          return;
        }

        if (caractere === '\u007f' || caractere === '\b') {
          valor = valor.slice(0, -1);
          continue;
        }

        valor += caractere;
      }
    };

    stdoutImpl.write(texto);
    stdinImpl.setRawMode(true);
    stdinImpl.resume();
    stdinImpl.on('data', aoReceberDado);
  });
}

async function obterSenhaPetlove({
  env = process.env,
  stdinImpl = stdin,
  stdoutImpl = stdout,
  perguntarSenhaOcultaFn = perguntarSenhaOculta,
} = {}) {
  const senha = textoSeguro(env.PETLOVE_LOGIN_PASSWORD);

  if (senha) {
    return senha;
  }

  if (!stdinImpl?.isTTY || !stdoutImpl?.isTTY) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'Senha Petlove requer terminal interativo.',
      1,
    );
  }

  return validarSenha(
    await perguntarSenhaOcultaFn('Senha Petlove (entrada oculta): ', stdinImpl, stdoutImpl),
  );
}

function normalizarClinicas(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      const clinicId = normalizarClinicId(item?.clinic_id ?? item?.id ?? item?.clinicId);
      const nome = textoSeguro(item?.name ?? item?.st_name ?? item?.clinic_name ?? item?.label);

      if (!clinicId) {
        return null;
      }

      return {
        clinic_id: clinicId,
        nome: nome || `Clinica ${clinicId}`,
      };
    })
    .filter(Boolean);
}

async function postarJson(url, payload, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw criarErroSanitizado('PETLOVE_INDISPONIVEL', 'Transporte fetch indisponivel.', 6);
  }

  let resposta;
  try {
    resposta = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    throw criarErroSanitizado('PETLOVE_INDISPONIVEL', 'Falha de rede no login Petlove.', 6);
  }

  let dados = null;
  try {
    dados = await resposta.json();
  } catch (_) {
    dados = null;
  }

  return { resposta, dados };
}

async function autenticarPetlove({
  baseUrl,
  email,
  senha,
  clinicId = null,
  fetchImpl = globalThis.fetch,
} = {}) {
  const url = `${validarBaseUrlPetloveLogin(baseUrl)}/api/login/local`;
  const payload = {
    username: validarEmail(email),
    password: validarSenha(senha),
    clinic_id: normalizarClinicId(clinicId),
  };

  const { resposta, dados } = await postarJson(url, payload, fetchImpl);

  if (resposta.status === 200) {
    return {
      tipo: 'token',
      authorization: montarAuthorization(dados),
      expiresIn: Number(dados?.expires_in) || null,
      clinicId: payload.clinic_id,
    };
  }

  if (resposta.status === 202) {
    const clinicas = normalizarClinicas(dados);

    if (clinicas.length === 0) {
      throw criarErroSanitizado(
        'PETLOVE_RESPOSTA_INVALIDA',
        'Resposta de login Petlove sem lista de clinicas.',
        5,
      );
    }

    return {
      tipo: 'clinicas',
      clinicas,
    };
  }

  if (resposta.status === 401 || resposta.status === 403) {
    throw criarErroSanitizado('PETLOVE_NAO_AUTORIZADA', 'Credenciais Petlove invalidas.', 3);
  }

  throw criarErroSanitizado('PETLOVE_INDISPONIVEL', 'Falha no login Petlove.', 6);
}

function montarPromptClinicas(clinicas) {
  const linhas = clinicas.map((clinica) => `- ${clinica.clinic_id}: ${clinica.nome}`);
  return `Selecione o clinic_id da Petlove:\n${linhas.join('\n')}\nclinic_id: `;
}

async function autenticarComSelecaoClinica({
  baseUrl,
  email,
  senha,
  perguntarFn = perguntar,
  fetchImpl = globalThis.fetch,
} = {}) {
  const tentativa = await autenticarPetlove({
    baseUrl,
    email,
    senha,
    fetchImpl,
  });

  if (tentativa.tipo !== 'clinicas') {
    return tentativa;
  }

  const clinicId = normalizarClinicId(await perguntarFn(montarPromptClinicas(tentativa.clinicas)));

  if (!clinicId) {
    throw criarErroSanitizado('VALIDACAO_LOCAL', 'clinic_id obrigatorio para concluir o login Petlove.', 1);
  }

  return autenticarPetlove({
    baseUrl,
    email,
    senha,
    clinicId,
    fetchImpl,
  });
}

function salvarAuthorizationEmArquivo(caminho, authorization, fsImpl = fs) {
  const caminhoSeguro = validarCaminhoAuthorizationFile(caminho);
  const authorizationSeguro = textoSeguro(authorization);

  if (!authorizationSeguro) {
    throw criarErroSanitizado('VALIDACAO_LOCAL', 'Authorization vazio.', 1);
  }

  const diretorio = path.dirname(caminhoSeguro);
  fsImpl.mkdirSync(diretorio, { recursive: true, mode: 0o700 });
  fsImpl.writeFileSync(caminhoSeguro, `${authorizationSeguro}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  if (typeof fsImpl.chmodSync === 'function') {
    fsImpl.chmodSync(caminhoSeguro, 0o600);
  }

  return caminhoSeguro;
}

function imprimirJson(objeto, stdoutImpl = stdout) {
  stdoutImpl.write(`${JSON.stringify(objeto, null, 2)}\n`);
}

async function main({
  env = process.env,
  fetchImpl = globalThis.fetch,
  fsImpl = fs,
  perguntarFn = perguntar,
  stdinImpl = stdin,
  stdoutImpl = stdout,
  perguntarSenhaOcultaFn = perguntarSenhaOculta,
} = {}) {
  try {
    const baseUrl = validarBaseUrlPetloveLogin(
      textoSeguro(env.PETLOVE_BASE_URL)
      || await perguntarFn(`PETLOVE_BASE_URL (Enter para ${DEFAULT_PETLOVE_BASE_URL}): `),
    );
    const email = validarEmail(
      textoSeguro(env.PETLOVE_LOGIN_EMAIL)
      || await perguntarFn('E-mail Petlove: '),
    );
    const senha = await obterSenhaPetlove({
      env,
      stdinImpl,
      stdoutImpl,
      perguntarSenhaOcultaFn,
    });
    const destino = validarCaminhoAuthorizationFile(
      textoSeguro(env.PETLOVE_AUTHORIZATION_FILE)
      || await perguntarFn(`Arquivo destino do Authorization (Enter para ${DEFAULT_AUTHORIZATION_FILE}): `),
    );

    const autenticacao = await autenticarComSelecaoClinica({
      baseUrl,
      email,
      senha,
      perguntarFn,
      fetchImpl,
    });

    const caminhoSalvo = salvarAuthorizationEmArquivo(destino, autenticacao.authorization, fsImpl);

    imprimirJson({
      ok: true,
      authorization_file: caminhoSalvo,
      clinic_id: autenticacao.clinicId,
      expires_in: autenticacao.expiresIn,
      observacao: 'Quando a Petlove responder nao autorizada, execute este CLI novamente para renovar o Authorization.',
    }, stdoutImpl);
    return 0;
  } catch (erro) {
    imprimirJson({
      ok: false,
      codigo: erro?.codigo || 'PETLOVE_ERRO_INESPERADO',
      mensagem: erro?.message || 'Erro inesperado sanitizado',
    }, stdoutImpl);
    return erro?.exitCode ?? 9;
  }
}

if (require.main === module) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

module.exports = {
  DEFAULT_AUTHORIZATION_FILE,
  autenticarComSelecaoClinica,
  autenticarPetlove,
  main,
  montarAuthorization,
  montarPromptClinicas,
  normalizarClinicas,
  obterSenhaPetlove,
  perguntarSenhaOculta,
  salvarAuthorizationEmArquivo,
  validarCaminhoAuthorizationFile,
  validarEmail,
  validarBaseUrlPetloveLogin,
  validarSenha,
};
