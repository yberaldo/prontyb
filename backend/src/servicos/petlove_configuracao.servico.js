'use strict'

const TIMEOUT_PADRAO_MS = 5000;
const TIMEOUT_MINIMO_MS = 1000;
const TIMEOUT_MAXIMO_MS = 15000;

function configuracaoDesabilitada() {
  return Object.freeze({ configurada: false });
}

function validarConfiguracaoPetlove(entrada = {}) {
  if (entrada.buscaHabilitada !== 'true') {
    return configuracaoDesabilitada();
  }

  const baseUrlTexto = typeof entrada.baseUrl === 'string' ? entrada.baseUrl.trim() : '';
  const authCookie = typeof entrada.authCookie === 'string' ? entrada.authCookie.trim() : '';
  if (!baseUrlTexto || !authCookie) {
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
    authCookie,
    timeoutMs
  });
}

function obterConfiguracaoPetlove() {
  return validarConfiguracaoPetlove({
    buscaHabilitada: process.env.PETLOVE_BUSCA_HABILITADA,
    baseUrl: process.env.PETLOVE_BASE_URL,
    authCookie: process.env.PETLOVE_AUTH_COOKIE,
    timeoutMs: process.env.PETLOVE_TIMEOUT_MS
  });
}

module.exports = {
  TIMEOUT_PADRAO_MS,
  validarConfiguracaoPetlove,
  obterConfiguracaoPetlove
};
