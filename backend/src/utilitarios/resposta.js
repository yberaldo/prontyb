'use strict'

// Utilitarios simples para padronizar respostas
module.exports = {
  sucesso: (dados = {}) => Object.assign({ ok: true }, dados),
  erroInterno: (mensagem = 'Erro interno') => ({ ok: false, mensagem })
};
