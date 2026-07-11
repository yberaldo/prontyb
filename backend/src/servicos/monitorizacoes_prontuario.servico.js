'use strict'

const fs = require('node:fs/promises');
const path = require('node:path');
const repositorio = require('../repositorios/monitorizacoes_prontuario.repositorio');
const prontuariosRepo = require('../repositorios/prontuarios_anestesicos.repositorio');
const { calcularSha256Arquivo, estaDentroDiretorio } = require('../utilitarios/arquivos_upload');

const STATUS_PERMITIDOS = ['pendente', 'extraido', 'revisado', 'erro'];
const TIPO_ANEXO_MONITORIZACAO = 'pdf_monitorizacao';
const LIMITE_LINHAS_PROCESSAMENTO_MANUAL = 2000;
const FORMATO_IMPORTACAO_CONFIRMADA = 'trend-table-v1';
const PARSER_VERSOES_SUPORTADAS = [1];
const CAMPOS_CLINICOS_PERMITIDOS = [
  'fc_bpm',
  'fr_rpm',
  'spo2_percent',
  'pressao_sis_mmhg',
  'pressao_dias_mmhg',
  'pressao_media_mmhg',
  'etco2_mmhg',
  'fico2_mmhg',
  'gas_mmhg',
  'temp1_c',
  'temp2_c'
];
const DIRETORIO_BACKEND = path.resolve(__dirname, '..', '..');
const DIRETORIO_UPLOADS_PRONTUARIOS = path.resolve(DIRETORIO_BACKEND, 'uploads', 'prontuarios');

function criarErro(mensagem, code, conflitos = null) {
  const err = new Error(mensagem);
  err.code = code;
  if (Array.isArray(conflitos)) err.conflitos = conflitos;
  return err;
}

function parseJson(valor) {
  if (valor === null || typeof valor === 'undefined') return null;
  if (typeof valor !== 'string') return valor;
  try {
    return JSON.parse(valor);
  } catch (_) {
    return valor;
  }
}

function validarStatus(status) {
  if (status === null || typeof status === 'undefined' || status === '') return null;
  if (!STATUS_PERMITIDOS.includes(status)) throw criarErro('status invalido', 'BAD_REQUEST');
  return status;
}

function validarObjetoJsonOuArrayOuNull(valor, campo) {
  if (valor === null || Array.isArray(valor)) return valor;
  if (typeof valor === 'object' && typeof valor !== 'undefined') return valor;
  throw criarErro(`${campo} deve ser objeto, array ou null`, 'BAD_REQUEST');
}

function validarObjetoJsonOuArray(valor, campo) {
  if (Array.isArray(valor)) return valor;
  if (valor !== null && typeof valor === 'object' && typeof valor !== 'undefined') return valor;
  throw criarErro(`${campo} deve ser objeto ou array`, 'BAD_REQUEST');
}

function normalizarHorario(valor, indice) {
  if (valor === null || typeof valor === 'undefined') return null;
  if (typeof valor !== 'string') throw criarErro(`linhas[${indice}].horario invalido`, 'BAD_REQUEST');

  const match = /^([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?$/.exec(valor);
  if (!match) throw criarErro(`linhas[${indice}].horario invalido`, 'BAD_REQUEST');

  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  const segundo = typeof match[3] === 'undefined' ? 0 : Number(match[3]);

  if (hora > 23 || minuto > 59 || segundo > 59) {
    throw criarErro(`linhas[${indice}].horario invalido`, 'BAD_REQUEST');
  }

  return `${match[1]}:${match[2]}:${String(segundo).padStart(2, '0')}`;
}

function normalizarDataMedicao(valor, indice) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw criarErro(`linhas[${indice}].data_medicao invalida`, 'BAD_REQUEST');
  }

  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw criarErro(`linhas[${indice}].data_medicao invalida`, 'BAD_REQUEST');
  }
  return valor;
}

function normalizarHorarioConfirmado(valor, indice) {
  if (typeof valor !== 'string') throw criarErro(`linhas[${indice}].horario invalido`, 'BAD_REQUEST');
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(valor);
  if (!match) throw criarErro(`linhas[${indice}].horario invalido`, 'BAD_REQUEST');

  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  const segundo = Number(match[3]);
  if (hora > 23 || minuto > 59 || segundo > 59) {
    throw criarErro(`linhas[${indice}].horario invalido`, 'BAD_REQUEST');
  }
  return valor;
}

function normalizarColunasConfirmadas(valor) {
  if (!Array.isArray(valor)) throw criarErro('colunas deve ser array', 'BAD_REQUEST');

  const keys = new Set();
  return valor.map((coluna, indice) => {
    if (!coluna || typeof coluna !== 'object' || Array.isArray(coluna)) {
      throw criarErro(`colunas[${indice}] invalida`, 'BAD_REQUEST');
    }
    const campos = ['key', 'label', 'unidade', 'origem'];
    for (const campo of Object.keys(coluna)) {
      if (!campos.includes(campo)) throw criarErro(`campo desconhecido em colunas[${indice}]: ${campo}`, 'BAD_REQUEST');
    }
    for (const campo of campos) {
      if (typeof coluna[campo] !== 'string' || coluna[campo].trim() === '') {
        throw criarErro(`colunas[${indice}].${campo} invalido`, 'BAD_REQUEST');
      }
    }
    if (!CAMPOS_CLINICOS_PERMITIDOS.includes(coluna.key)) {
      throw criarErro(`colunas[${indice}].key invalida`, 'BAD_REQUEST');
    }
    if (keys.has(coluna.key)) throw criarErro(`coluna duplicada: ${coluna.key}`, 'BAD_REQUEST');
    keys.add(coluna.key);
    return {
      key: coluna.key,
      label: coluna.label,
      unidade: coluna.unidade,
      origem: coluna.origem
    };
  });
}

function normalizarDadosConfirmados(valor, indice) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw criarErro(`linhas[${indice}].dados invalido`, 'BAD_REQUEST');
  }

  const dados = {};
  for (const campo of Object.keys(valor)) {
    if (!CAMPOS_CLINICOS_PERMITIDOS.includes(campo)) {
      throw criarErro(`chave clinica invalida em linhas[${indice}]: ${campo}`, 'BAD_REQUEST');
    }

    const numero = valor[campo];
    if (numero === null || numero === '' || typeof numero === 'undefined') continue;
    if (typeof numero !== 'number' || !Number.isFinite(numero)) {
      throw criarErro(`linhas[${indice}].dados.${campo} invalido`, 'BAD_REQUEST');
    }
    if (numero < 0 || (campo === 'spo2_percent' && numero > 100)) {
      throw criarErro(`linhas[${indice}].dados.${campo} fora do limite permitido`, 'BAD_REQUEST');
    }
    if (campo === 'gas_mmhg' && numero === 0) continue;
    dados[campo] = numero;
  }

  if (Object.keys(dados).length === 0) {
    throw criarErro(`linhas[${indice}] deve ter ao menos uma celula clinica valida`, 'BAD_REQUEST');
  }

  if (Object.prototype.hasOwnProperty.call(dados, 'gas_mmhg')) {
    dados.cam_percent = dados.gas_mmhg / 760 * 100;
  }
  return dados;
}

function validarBodyImportacaoConfirmada(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw criarErro('body invalido', 'BAD_REQUEST');
  }
  const permitidos = ['formato', 'parser_versao', 'colunas', 'linhas'];
  for (const campo of Object.keys(body)) {
    if (!permitidos.includes(campo)) throw criarErro(`campo desconhecido no body: ${campo}`, 'BAD_REQUEST');
  }
  for (const campo of permitidos) {
    if (!Object.prototype.hasOwnProperty.call(body, campo)) {
      throw criarErro(`campo obrigatorio ausente: ${campo}`, 'BAD_REQUEST');
    }
  }
  if (body.formato !== FORMATO_IMPORTACAO_CONFIRMADA) throw criarErro('formato invalido', 'BAD_REQUEST');
  if (!Number.isSafeInteger(body.parser_versao) || body.parser_versao <= 0 || !PARSER_VERSOES_SUPORTADAS.includes(body.parser_versao)) {
    throw criarErro('parser_versao invalida', 'BAD_REQUEST');
  }
  const colunas = normalizarColunasConfirmadas(body.colunas);
  if (!Array.isArray(body.linhas) || body.linhas.length === 0) {
    throw criarErro('linhas deve ter ao menos 1 item', 'BAD_REQUEST');
  }
  if (body.linhas.length > LIMITE_LINHAS_PROCESSAMENTO_MANUAL) {
    throw criarErro(`linhas excede limite de ${LIMITE_LINHAS_PROCESSAMENTO_MANUAL} itens`, 'BAD_REQUEST');
  }

  const ordens = new Set();
  const horarios = new Set();
  let celulas_salvas = 0;
  const linhas = body.linhas.map((linha, indice) => {
    if (!linha || typeof linha !== 'object' || Array.isArray(linha)) {
      throw criarErro(`linhas[${indice}] invalida`, 'BAD_REQUEST');
    }
    const campos = ['ordem', 'data_medicao', 'horario', 'dados'];
    for (const campo of Object.keys(linha)) {
      if (!campos.includes(campo)) throw criarErro(`campo desconhecido em linhas[${indice}]: ${campo}`, 'BAD_REQUEST');
    }
    if (!Number.isSafeInteger(linha.ordem) || linha.ordem < 0) {
      throw criarErro(`linhas[${indice}].ordem invalida`, 'BAD_REQUEST');
    }
    if (ordens.has(linha.ordem)) throw criarErro(`ordem duplicada: ${linha.ordem}`, 'BAD_REQUEST');
    ordens.add(linha.ordem);

    const data_medicao = normalizarDataMedicao(linha.data_medicao, indice);
    const horario = normalizarHorarioConfirmado(linha.horario, indice);
    const chaveHorario = `${data_medicao}T${horario}`;
    if (horarios.has(chaveHorario)) {
      throw criarErro('horario de monitorizacao duplicado', 'CONFLICT', [{ data_medicao, horario }]);
    }
    horarios.add(chaveHorario);

    const dados = normalizarDadosConfirmados(linha.dados, indice);
    celulas_salvas += Object.keys(dados).length;
    return { ordem: linha.ordem, data_medicao, horario, dados_json: dados };
  });

  return {
    colunas_json: colunas,
    dados_json: { formato: body.formato, parser_versao: body.parser_versao },
    linhas,
    celulas_salvas
  };
}

async function calcularSha256DoAnexo(prontuario_id, monitorizacao) {
  const caminhoRelativo = monitorizacao && monitorizacao.anexo_caminho_arquivo;
  if (!caminhoRelativo || typeof caminhoRelativo !== 'string') {
    throw criarErro('arquivo da monitorizacao indisponivel', 'CONFLICT');
  }

  const diretorioProntuario = path.resolve(DIRETORIO_UPLOADS_PRONTUARIOS, String(prontuario_id));
  const caminhoAbsoluto = path.resolve(DIRETORIO_BACKEND, caminhoRelativo);
  if (!estaDentroDiretorio(diretorioProntuario, caminhoAbsoluto)) {
    throw criarErro('arquivo da monitorizacao indisponivel', 'CONFLICT');
  }
  try {
    const stat = await fs.stat(caminhoAbsoluto);
    if (!stat.isFile()) throw new Error('arquivo invalido');
    return await calcularSha256Arquivo(caminhoAbsoluto);
  } catch (_) {
    throw criarErro('arquivo da monitorizacao indisponivel', 'CONFLICT');
  }
}

function validarBodyProcessamentoManual(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw criarErro('body invalido', 'BAD_REQUEST');
  }

  const permitidos = ['colunas_json', 'dados_json', 'linhas'];
  for (const campo of Object.keys(body)) {
    if (!permitidos.includes(campo)) throw criarErro(`campo desconhecido no body: ${campo}`, 'BAD_REQUEST');
  }

  for (const campo of permitidos) {
    if (!Object.prototype.hasOwnProperty.call(body, campo)) {
      throw criarErro(`campo obrigatorio ausente: ${campo}`, 'BAD_REQUEST');
    }
  }

  if (!Array.isArray(body.colunas_json)) {
    throw criarErro('colunas_json deve ser array', 'BAD_REQUEST');
  }

  const dados_json = validarObjetoJsonOuArrayOuNull(body.dados_json, 'dados_json');

  if (!Array.isArray(body.linhas)) {
    throw criarErro('linhas deve ser array', 'BAD_REQUEST');
  }
  if (body.linhas.length === 0) {
    throw criarErro('linhas deve ter ao menos 1 item', 'BAD_REQUEST');
  }
  if (body.linhas.length > LIMITE_LINHAS_PROCESSAMENTO_MANUAL) {
    throw criarErro(`linhas excede limite de ${LIMITE_LINHAS_PROCESSAMENTO_MANUAL} itens`, 'BAD_REQUEST');
  }

  const ordens = new Set();
  const linhas = body.linhas.map((linha, indice) => {
    if (!linha || typeof linha !== 'object' || Array.isArray(linha)) {
      throw criarErro(`linhas[${indice}] invalida`, 'BAD_REQUEST');
    }

    const permitidosLinha = ['ordem', 'horario', 'dados_json'];
    for (const campo of Object.keys(linha)) {
      if (!permitidosLinha.includes(campo)) throw criarErro(`campo desconhecido em linhas[${indice}]: ${campo}`, 'BAD_REQUEST');
    }

    if (!Object.prototype.hasOwnProperty.call(linha, 'ordem')) {
      throw criarErro(`linhas[${indice}].ordem obrigatoria`, 'BAD_REQUEST');
    }
    if (!Number.isSafeInteger(linha.ordem) || linha.ordem < 0) {
      throw criarErro(`linhas[${indice}].ordem invalida`, 'BAD_REQUEST');
    }
    if (ordens.has(linha.ordem)) {
      throw criarErro(`ordem duplicada: ${linha.ordem}`, 'BAD_REQUEST');
    }
    ordens.add(linha.ordem);

    if (!Object.prototype.hasOwnProperty.call(linha, 'dados_json')) {
      throw criarErro(`linhas[${indice}].dados_json obrigatorio`, 'BAD_REQUEST');
    }

    return {
      ordem: linha.ordem,
      horario: normalizarHorario(linha.horario, indice),
      dados_json: validarObjetoJsonOuArray(linha.dados_json, `linhas[${indice}].dados_json`)
    };
  });

  return {
    colunas_json: body.colunas_json,
    dados_json,
    linhas
  };
}

function validarBodyRevisao(body) {
  if (body === null || typeof body === 'undefined') return;
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw criarErro('body invalido', 'BAD_REQUEST');
  }

  const campos = Object.keys(body);
  if (campos.length > 0) {
    throw criarErro(`campo desconhecido no body: ${campos[0]}`, 'BAD_REQUEST');
  }
}

function erroStatusNaoRevisavel(status) {
  if (status === 'pendente') return criarErro('monitorizacao ainda nao foi extraida', 'CONFLICT');
  if (status === 'revisado') return criarErro('monitorizacao ja revisada', 'CONFLICT');
  if (status === 'erro') return criarErro('monitorizacao com erro nao pode ser revisada', 'CONFLICT');
  return criarErro('monitorizacao nao pode ser revisada', 'CONFLICT');
}

module.exports = {
  STATUS_PERMITIDOS,
  CAMPOS_CLINICOS_PERMITIDOS,
  _validarBodyImportacaoConfirmada: validarBodyImportacaoConfirmada,

  _serializeMonitorizacao(reg) {
    if (!reg) return null;
    return {
      id: reg.id,
      prontuario_id: reg.prontuario_id,
      anexo_id: reg.anexo_id,
      arquivo_sha256: reg.arquivo_sha256 || null,
      status: reg.status,
      dados_json: parseJson(reg.dados_json),
      colunas_json: parseJson(reg.colunas_json),
      criado_em: reg.criado_em,
      atualizado_em: reg.atualizado_em,
      anexo: {
        id: reg.anexo_id_join,
        tipo_anexo: reg.anexo_tipo_anexo,
        nome_arquivo: reg.anexo_nome_arquivo,
        mime_type: reg.anexo_mime_type,
        tamanho_bytes: Number(reg.anexo_tamanho_bytes)
      }
    };
  },

  _serializeLinha(reg) {
    if (!reg) return null;
    return {
      id: reg.id,
      prontuario_id: reg.prontuario_id,
      monitorizacao_extraida_id: reg.monitorizacao_extraida_id,
      data_medicao: reg.data_medicao || null,
      horario: reg.horario,
      dados_json: parseJson(reg.dados_json),
      ordem: reg.ordem
    };
  },

  async listarPorProntuarioId(fastify, prontuario_id, filtros = {}) {
    const status = validarStatus(filtros.status);

    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) throw criarErro('prontuario nao encontrado', 'NOT_FOUND');

    const rows = await repositorio.listarPorProntuarioId(fastify, prontuario_id, { status });
    return rows.map(r => module.exports._serializeMonitorizacao(r));
  },

  async buscarPorId(fastify, prontuario_id, monitorizacao_extraida_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) throw criarErro('prontuario nao encontrado', 'NOT_FOUND');

    const reg = await repositorio.buscarPorId(fastify, monitorizacao_extraida_id, prontuario_id);
    if (!reg) throw criarErro('monitorizacao nao encontrada', 'NOT_FOUND');

    return module.exports._serializeMonitorizacao(reg);
  },

  async listarLinhas(fastify, prontuario_id, monitorizacao_extraida_id) {
    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) throw criarErro('prontuario nao encontrado', 'NOT_FOUND');

    const monitorizacao = await repositorio.buscarPorId(fastify, monitorizacao_extraida_id, prontuario_id);
    if (!monitorizacao) throw criarErro('monitorizacao nao encontrada', 'NOT_FOUND');

    const rows = await repositorio.listarLinhasPorMonitorizacaoId(fastify, prontuario_id, monitorizacao_extraida_id);
    return rows.map(r => module.exports._serializeLinha(r));
  },

  async processarManual(fastify, prontuario_id, monitorizacao_extraida_id, body = {}) {
    const dados = validarBodyProcessamentoManual(body);

    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) throw criarErro('prontuario nao encontrado', 'NOT_FOUND');

    const monitorizacao = await repositorio.buscarPorId(fastify, monitorizacao_extraida_id, prontuario_id);
    if (!monitorizacao) throw criarErro('monitorizacao nao encontrada', 'NOT_FOUND');

    if (monitorizacao.anexo_tipo_anexo !== TIPO_ANEXO_MONITORIZACAO) {
      throw criarErro('anexo da monitorizacao deve ser pdf_monitorizacao', 'BAD_REQUEST');
    }

    if (monitorizacao.status !== 'pendente') {
      throw criarErro('monitorizacao nao esta pendente', 'CONFLICT');
    }

    return repositorio.processarManualEstruturado(fastify, {
      prontuario_id,
      monitorizacao_extraida_id,
      colunas_json: dados.colunas_json,
      dados_json: dados.dados_json,
      linhas: dados.linhas
    });
  },

  async importarConfirmadas(fastify, prontuario_id, monitorizacao_extraida_id, body = {}) {
    const dados = validarBodyImportacaoConfirmada(body);

    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) throw criarErro('prontuario nao encontrado', 'NOT_FOUND');

    const monitorizacao = await repositorio.buscarPorId(fastify, monitorizacao_extraida_id, prontuario_id);
    if (!monitorizacao) throw criarErro('monitorizacao nao encontrada', 'NOT_FOUND');
    if (monitorizacao.anexo_tipo_anexo !== TIPO_ANEXO_MONITORIZACAO) {
      throw criarErro('anexo da monitorizacao deve ser pdf_monitorizacao', 'BAD_REQUEST');
    }
    if (monitorizacao.status === 'revisado') throw criarErro('monitorizacao ja revisada', 'CONFLICT');
    if (monitorizacao.status !== 'pendente') throw criarErro('monitorizacao nao esta pendente', 'CONFLICT');

    const arquivo_sha256 = await calcularSha256DoAnexo(prontuario_id, monitorizacao);
    return repositorio.importarConfirmadas(fastify, {
      prontuario_id,
      monitorizacao_extraida_id,
      arquivo_sha256,
      colunas_json: dados.colunas_json,
      dados_json: dados.dados_json,
      linhas: dados.linhas,
      celulas_salvas: dados.celulas_salvas
    });
  },

  async revisar(fastify, prontuario_id, monitorizacao_extraida_id, body = null) {
    validarBodyRevisao(body);

    const prontuario = await prontuariosRepo.buscarPorId(fastify, prontuario_id);
    if (!prontuario) throw criarErro('prontuario nao encontrado', 'NOT_FOUND');

    const monitorizacao = await repositorio.buscarPorId(fastify, monitorizacao_extraida_id, prontuario_id);
    if (!monitorizacao) throw criarErro('monitorizacao nao encontrada', 'NOT_FOUND');

    if (monitorizacao.status !== 'extraido') {
      throw erroStatusNaoRevisavel(monitorizacao.status);
    }

    const affected = await repositorio.marcarRevisada(fastify, prontuario_id, monitorizacao_extraida_id);
    if (affected !== 1) {
      const atual = await repositorio.buscarPorId(fastify, monitorizacao_extraida_id, prontuario_id);
      if (!atual) throw criarErro('monitorizacao nao encontrada', 'NOT_FOUND');
      throw erroStatusNaoRevisavel(atual.status);
    }

    return {
      id: monitorizacao_extraida_id,
      prontuario_id,
      status: 'revisado'
    };
  }
};
