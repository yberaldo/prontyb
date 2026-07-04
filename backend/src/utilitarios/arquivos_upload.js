'use strict'

const crypto = require('node:crypto');
const path = require('node:path');

const LIMITE_TAMANHO_UPLOAD_ANEXO_BYTES = 20 * 1024 * 1024;
const TIPOS_ANEXO_PERMITIDOS = ['pdf_monitorizacao', 'pdf_prontuario_final', 'outro'];
const MIME_EXTENSOES_PERMITIDAS = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

function erroValidacao(mensagem, code = 'BAD_REQUEST') {
  const err = new Error(mensagem);
  err.code = code;
  return err;
}

function obterNomeBase(nomeOriginal) {
  const nome = typeof nomeOriginal === 'string' && nomeOriginal.trim() ? nomeOriginal.trim() : 'arquivo';
  const partes = nome.replace(/\\/g, '/').split('/');
  return partes[partes.length - 1] || 'arquivo';
}

function sanitizarNomeArquivo(nomeOriginal) {
  const base = obterNomeBase(nomeOriginal)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const sanitizado = base
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/[.-]+$/g, '');

  return sanitizado || 'arquivo';
}

function gerarTimestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function nomeOriginalInformado(nomeOriginal) {
  return typeof nomeOriginal === 'string' && nomeOriginal.trim() !== '';
}

function validarMimeExtensao(mimeType, nomeSanitizado, nomeOriginal) {
  if (!Object.prototype.hasOwnProperty.call(MIME_EXTENSOES_PERMITIDAS, mimeType)) {
    throw erroValidacao('mime_type invalido');
  }

  const ext = path.extname(nomeSanitizado).toLowerCase();
  if (!ext && !nomeOriginalInformado(nomeOriginal)) {
    return MIME_EXTENSOES_PERMITIDAS[mimeType][0];
  }

  if (!ext || !MIME_EXTENSOES_PERMITIDAS[mimeType].includes(ext)) {
    throw erroValidacao('extensao incompativel com mime_type');
  }

  return ext;
}

function limitarStem(stem, limite) {
  const limpo = (stem || 'arquivo').replace(/^\.+/, '').replace(/[.-]+$/g, '') || 'arquivo';
  return limpo.slice(0, limite).replace(/[.-]+$/g, '') || 'arquivo';
}

function gerarNomeFinal({ prontuarioId, nomeOriginal, mimeType }) {
  const nomeSanitizado = sanitizarNomeArquivo(nomeOriginal);
  const ext = validarMimeExtensao(mimeType, nomeSanitizado, nomeOriginal);
  const stemOriginal = path.basename(nomeSanitizado, ext);
  const prefixoRelativo = `uploads/prontuarios/${prontuarioId}/`;
  const maxNomeArquivo = Math.min(255, 255 - prefixoRelativo.length);
  const prefixoNome = `${gerarTimestamp()}-${crypto.randomBytes(8).toString('hex')}-`;
  const maxStem = maxNomeArquivo - prefixoNome.length - ext.length;

  if (maxStem < 1) {
    throw erroValidacao('caminho_arquivo excede limite');
  }

  const stem = limitarStem(stemOriginal, maxStem);
  const nomeArquivo = `${prefixoNome}${stem}${ext}`;
  const caminhoArquivo = `${prefixoRelativo}${nomeArquivo}`;

  if (nomeArquivo.length > 255 || caminhoArquivo.length > 255) {
    throw erroValidacao('caminho_arquivo excede limite');
  }

  return { nomeArquivo, caminhoArquivo };
}

function estaDentroDiretorio(diretorioBase, destino) {
  const relativo = path.relative(diretorioBase, destino);
  return relativo === '' || (!relativo.startsWith('..') && !path.isAbsolute(relativo));
}

module.exports = {
  LIMITE_TAMANHO_UPLOAD_ANEXO_BYTES,
  TIPOS_ANEXO_PERMITIDOS,
  MIME_EXTENSOES_PERMITIDAS,
  erroValidacao,
  gerarNomeFinal,
  estaDentroDiretorio
};
