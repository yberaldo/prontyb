'use strict'

const fs = require('node:fs');

const TIMEOUT_PADRAO_MS = 5000;
const TIMEOUT_MINIMO_MS = 1000;
const TIMEOUT_MAXIMO_MS = 15000;

function configuracaoDesabilitada() {
  return Object.freeze({ configurada: false });
}

function textoSeguro(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function lerSegredoArquivo(caminho, fsImpl = fs) {
  const caminhoSeguro = textoSeguro(caminho);
  if (!caminhoSeguro) {
    return '';
  }

  try {
    return textoSeguro(fsImpl.readFileSync(caminhoSeguro, 'utf8'));
  } catch (_) {
    return '';
  }
}

function obterAuthorization(entrada = {}, fsImpl = fs) {
  const authorization = textoSeguro(entrada.authorization);
  if (authorization) {
    return authorization;
  }

  return lerSegredoArquivo(entrada.authorizationFile, fsImpl);
}

function obterAuthCookie(entrada = {}) {
  return textoSeguro(entrada.authCookie);
}

function validarConfiguracaoPetlove(entrada = {}, dependencias = {}) {
  if (entrada.buscaHabilitada !== 'true') {
    return configuracaoDesabilitada();
  }

  const baseUrlTexto = textoSeguro(entrada.baseUrl);
  const authorization = obterAuthorization(entrada, dependencias.fs || fs);
  const authCookie = obterAuthCookie(entrada);
  if (!baseUrlTexto || (!authorization && !authCookie)) {
    return configuracaoDesabilitada();
  }

  let baseUrl;
  try {
    const url = new URL(baseUrlTexto);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return configuracaoDesabilitada();
    }
    baseUrl = url.toString().replace(/\/+$/, '');
  } catch (_) {
    return configuracaoDesabilitada();
  }

  let timeoutMs = TIMEOUT_PADRAO_MS;
  if (entrada.timeoutMs !== undefined && entrada.timeoutMs !== '') {
    const timeoutInformado = Number(entrada.timeoutMs);
    if (
      !Number.isInteger(timeoutInformado) ||
      timeoutInformado < TIMEOUT_MINIMO_MS ||
      timeoutInformado > TIMEOUT_MAXIMO_MS
    ) {
      return configuracaoDesabilitada();
    }
    timeoutMs = timeoutInformado;
  }

  return Object.freeze({
    configurada: true,
    baseUrl,
    authorization,
    authCookie,
    timeoutMs
  });
}

function obterConfiguracaoPetlove() {
  return validarConfiguracaoPetlove({
    buscaHabilitada: process.env.PETLOVE_BUSCA_HABILITADA,
    baseUrl: process.env.PETLOVE_BASE_URL,
    authorization: process.env.PETLOVE_AUTHORIZATION,
    authorizationFile: process.env.PETLOVE_AUTHORIZATION_FILE,
    authCookie: process.env.PETLOVE_AUTH_COOKIE,
    timeoutMs: process.env.PETLOVE_TIMEOUT_MS
  });
}

module.exports = {
  TIMEOUT_PADRAO_MS,
  obterAuthorization,
  obterAuthCookie,
  validarConfiguracaoPetlove,
  obterConfiguracaoPetlove
};
