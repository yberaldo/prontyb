'use strict'

const { obterConfiguracaoPetlove } = require('./petlove_configuracao.servico');
const { criarClientPetlove, CODIGOS_ERRO_CLIENT } = require('./petlove_client.servico');
const {
  normalizarPacientePetlove,
  ErroNormalizacaoPetlove
} = require('./petlove_normalizador.servico');

function criarErro(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const ERRO_PETLOVE_NAO_CONFIGURADA = {
  code: 'PETLOVE_NAO_CONFIGURADA',
  mensagem: 'Busca Petlove nao configurada'
};

const ERROS_PUBLICOS = Object.freeze({
  [CODIGOS_ERRO_CLIENT.NAO_AUTORIZADA]: Object.freeze({
    status: 503,
    code: CODIGOS_ERRO_CLIENT.NAO_AUTORIZADA,
    mensagem: 'Acesso Petlove nao autorizado'
  }),
  [CODIGOS_ERRO_CLIENT.NAO_ENCONTRADO]: Object.freeze({
    status: 404,
    code: CODIGOS_ERRO_CLIENT.NAO_ENCONTRADO,
    mensagem: 'Paciente nao encontrado na Petlove'
  }),
  [CODIGOS_ERRO_CLIENT.INDISPONIVEL]: Object.freeze({
    status: 503,
    code: CODIGOS_ERRO_CLIENT.INDISPONIVEL,
    mensagem: 'Busca Petlove temporariamente indisponivel'
  }),
  [CODIGOS_ERRO_CLIENT.RESPOSTA_INVALIDA]: Object.freeze({
    status: 502,
    code: CODIGOS_ERRO_CLIENT.RESPOSTA_INVALIDA,
    mensagem: 'Resposta Petlove invalida'
  })
});

function criarServicoConsulta({
  obterConfiguracao = obterConfiguracaoPetlove,
  criarClient = criarClientPetlove
} = {}) {
  return {
    async buscarPorMicrochip(microchip) {
      const configuracao = obterConfiguracao();
      if (!configuracao || !configuracao.configurada) {
        throw criarErro(
          ERRO_PETLOVE_NAO_CONFIGURADA.code,
          ERRO_PETLOVE_NAO_CONFIGURADA.mensagem
        );
      }

      const client = criarClient({ configuracao });
      const payload = await client.buscarPorMicrochip(microchip);

      try {
        return normalizarPacientePetlove(payload);
      } catch (erro) {
        if (erro instanceof ErroNormalizacaoPetlove) {
          const publico = ERROS_PUBLICOS[CODIGOS_ERRO_CLIENT.RESPOSTA_INVALIDA];
          throw criarErro(publico.code, publico.mensagem);
        }
        throw erro;
      }
    }
  };
}

const servicoPadrao = criarServicoConsulta();

module.exports = {
  ERRO_PETLOVE_NAO_CONFIGURADA,
  ERROS_PUBLICOS,
  criarServicoConsulta,
  buscarPorMicrochip: servicoPadrao.buscarPorMicrochip
};
