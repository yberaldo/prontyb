'use strict'

function criarErro(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const ERRO_PETLOVE_NAO_CONFIGURADA = {
  code: 'PETLOVE_NAO_CONFIGURADA',
  mensagem: 'Busca Petlove nao configurada'
};

async function buscarPorMicrochip() {
  throw criarErro(ERRO_PETLOVE_NAO_CONFIGURADA.code, ERRO_PETLOVE_NAO_CONFIGURADA.mensagem);
}

module.exports = {
  ERRO_PETLOVE_NAO_CONFIGURADA,
  buscarPorMicrochip
};
