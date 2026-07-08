'use strict'

const CODIGOS_ERRO_CLIENT = Object.freeze({
  NAO_AUTORIZADA: 'PETLOVE_NAO_AUTORIZADA',
  NAO_ENCONTRADO: 'PACIENTE_NAO_ENCONTRADO',
  INDISPONIVEL: 'PETLOVE_INDISPONIVEL',
  RESPOSTA_INVALIDA: 'PETLOVE_RESPOSTA_INVALIDA'
});

function criarErroClient(code) {
  const erro = new Error('Falha controlada na consulta Petlove');
  erro.code = code;
  return erro;
}

function ehAbortError(erro) {
  return Boolean(erro) && (erro.name === 'AbortError' || erro.code === 'ABORT_ERR');
}

function montarHeadersPetlove(configuracao) {
  const headers = {
    Accept: 'application/json'
  };

  if (configuracao.authorization) {
    headers.Authorization = configuracao.authorization;
  }

  if (configuracao.authCookie) {
    headers.Cookie = configuracao.authCookie;
  }

  return headers;
}

function criarClientPetlove({
  configuracao,
  transporte = globalThis.fetch,
  AbortControllerImpl = globalThis.AbortController
}) {
  if (!configuracao || !configuracao.configurada || typeof transporte !== 'function') {
    throw criarErroClient(CODIGOS_ERRO_CLIENT.INDISPONIVEL);
  }

  return {
    async buscarPorMicrochip(microchip) {
      const url = `${configuracao.baseUrl}/api/atendimento/${encodeURIComponent(microchip)}`;
      const controlador = typeof AbortControllerImpl === 'function'
        ? new AbortControllerImpl()
        : null;
      const timer = controlador
        ? setTimeout(() => controlador.abort(), configuracao.timeoutMs)
        : null;

      try {
        let resposta;
        try {
          resposta = await transporte(url, {
            method: 'GET',
            headers: montarHeadersPetlove(configuracao),
            signal: controlador ? controlador.signal : undefined
          });
        } catch (erro) {
          if (ehAbortError(erro)) {
            throw criarErroClient(CODIGOS_ERRO_CLIENT.INDISPONIVEL);
          }
          throw criarErroClient(CODIGOS_ERRO_CLIENT.INDISPONIVEL);
        }

        if (!resposta || typeof resposta.status !== 'number') {
          throw criarErroClient(CODIGOS_ERRO_CLIENT.RESPOSTA_INVALIDA);
        }
        if (resposta.status === 401 || resposta.status === 403) {
          throw criarErroClient(CODIGOS_ERRO_CLIENT.NAO_AUTORIZADA);
        }
        if (resposta.status === 404) {
          throw criarErroClient(CODIGOS_ERRO_CLIENT.NAO_ENCONTRADO);
        }
        if (resposta.status === 429 || resposta.status >= 500) {
          throw criarErroClient(CODIGOS_ERRO_CLIENT.INDISPONIVEL);
        }
        if (resposta.status < 200 || resposta.status >= 300 || typeof resposta.json !== 'function') {
          throw criarErroClient(CODIGOS_ERRO_CLIENT.RESPOSTA_INVALIDA);
        }

        try {
          return await resposta.json();
        } catch (erro) {
          if (ehAbortError(erro)) {
            throw criarErroClient(CODIGOS_ERRO_CLIENT.INDISPONIVEL);
          }
          throw criarErroClient(CODIGOS_ERRO_CLIENT.RESPOSTA_INVALIDA);
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  };
}

module.exports = {
  CODIGOS_ERRO_CLIENT,
  criarClientPetlove,
  montarHeadersPetlove
};
