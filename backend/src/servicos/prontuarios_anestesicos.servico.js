'use strict'

const repositorio = require('../repositorios/prontuarios_anestesicos.repositorio');

// Valida e normaliza IDs vindos do body.
// Aceita números inteiros seguros positivos (tipo number) ou
// strings CANÔNICAS que batem com /^[1-9][0-9]*$/.
// Retorna o número (tipo number) se válido, ou lança Error BAD_REQUEST.
function parseAndValidateId(raw, field) {
  const throwInvalid = () => { const err = new Error(`${field} invalido`); err.code = 'BAD_REQUEST'; throw err; };

  if (typeof raw === 'number') {
    if (!Number.isSafeInteger(raw) || raw <= 0) return throwInvalid();
    return raw;
  }

  if (typeof raw === 'string') {
    if (!/^[1-9][0-9]*$/.test(raw)) return throwInvalid();
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n <= 0) return throwInvalid();
    return n;
  }

  // boolean, object, array, undefined, null (when called) -> inválido
  return throwInvalid();
}

function numeroAutomatico(id) {
  return `PR-${String(id).padStart(6, '0')}`;
}

function numeroTemporario() {
  return `TMP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

module.exports = {
  // Serializa um registro bruto vindo do repositório para o contrato de API
  _serialize(reg) {
    if (!reg) return null;

    // helper to detect already-serialized related object
    const isNested = v => v && typeof v === 'object' && (Object.prototype.hasOwnProperty.call(v, 'id') || Object.prototype.hasOwnProperty.call(v, 'nome'));

    const item = {
      id: reg.id,
      numero_prontuario: reg.numero_prontuario,
      clinica_id: reg.clinica_id,
      nome_animal: reg.nome_animal,
      especie: reg.especie,
      raca: reg.raca,
      sexo: reg.sexo,
      idade: reg.idade,
      peso: reg.peso,
      nome_tutor: reg.nome_tutor,
      nome_procedimento: reg.nome_procedimento,
      data_procedimento: reg.data_procedimento,
      cirurgiao_id: reg.cirurgiao_id,
      anestesista_id: reg.anestesista_id,
      observacoes_pre_anestesicas: reg.observacoes_pre_anestesicas,
      criado_em: reg.criado_em,
      atualizado_em: reg.atualizado_em
    };

    // clinica: aceitar registro já serializado ou campos achatados
    if (isNested(reg.clinica)) {
      item.clinica = { id: reg.clinica.id || null, nome: reg.clinica.nome || null };
    } else if (reg.clinica_id === null || typeof reg.clinica_id === 'undefined') {
      item.clinica = null;
    } else {
      item.clinica = { id: reg.clinica_id || null, nome: reg.clinica_nome || null };
    }

    // anestesista: aceitar registro já serializado ou campos achatados
    if (isNested(reg.anestesista)) {
      item.anestesista = {
        id: reg.anestesista.id || null,
        nome: reg.anestesista.nome || null,
        crmv: reg.anestesista.crmv || null,
        uf: reg.anestesista.uf || null
      };
    } else if (reg.anestesista_id === null || typeof reg.anestesista_id === 'undefined') {
      item.anestesista = null;
    } else {
      item.anestesista = { id: reg.anestesista_id || null, nome: reg.anestesista_nome || null, crmv: reg.anestesista_crmv || null, uf: reg.anestesista_uf || null };
    }

    // cirurgiao: aceitar registro já serializado ou campos achatados
    if (isNested(reg.cirurgiao)) {
      item.cirurgiao = {
        id: reg.cirurgiao.id || null,
        nome: reg.cirurgiao.nome || null,
        crmv: reg.cirurgiao.crmv || null,
        uf: reg.cirurgiao.uf || null
      };
    } else if (reg.cirurgiao_id === null || typeof reg.cirurgiao_id === 'undefined') {
      item.cirurgiao = null;
    } else {
      item.cirurgiao = { id: reg.cirurgiao_id || null, nome: reg.cirurgiao_nome || null, crmv: reg.cirurgiao_crmv || null, uf: reg.cirurgiao_uf || null };
    }

    return item;
  },

  async listar(fastify, filtros) {
    const rows = await repositorio.listar(fastify, filtros);
    return rows.map(r => module.exports._serialize(r));
  },

  async obterPorId(fastify, id) {
    const row = await repositorio.buscarPorId(fastify, id);
    return module.exports._serialize(row);
  },

  async criar(fastify, dados) {
    // validar campos obrigatorios conforme migration
    const required = ['nome_animal','especie','nome_tutor','nome_procedimento','data_procedimento','anestesista_id'];
    for (const f of required) {
      if (!Object.prototype.hasOwnProperty.call(dados, f) || dados[f] === null || dados[f] === undefined || (typeof dados[f] === 'string' && dados[f].trim() === '')) {
        const err = new Error(`campo obrigatorio ausente: ${f}`);
        err.code = 'BAD_REQUEST';
        throw err;
      }
    }

    const gerarNumero = !Object.prototype.hasOwnProperty.call(dados, 'numero_prontuario') || dados.numero_prontuario === null || dados.numero_prontuario === undefined || (typeof dados.numero_prontuario === 'string' && dados.numero_prontuario.trim() === '');
    if (gerarNumero) {
      dados.numero_prontuario = numeroTemporario();
    }

    // validar tipos basicos (anestesista_id é obrigatório conforme migration)
    dados.anestesista_id = parseAndValidateId(dados.anestesista_id, 'anestesista_id');

    if (Object.prototype.hasOwnProperty.call(dados, 'clinica_id') && dados.clinica_id !== null && dados.clinica_id !== undefined) {
      dados.clinica_id = parseAndValidateId(dados.clinica_id, 'clinica_id');
      const [rows] = await fastify.mysql.query('SELECT id FROM clinicas WHERE id = ? LIMIT 1', [dados.clinica_id]);
      if (!rows || rows.length === 0) { const err = new Error('clinica inexistente'); err.code = 'BAD_REQUEST'; throw err; }
    }

    // validar anestesista existe
    const [aRows] = await fastify.mysql.query('SELECT id FROM profissionais WHERE id = ? LIMIT 1', [dados.anestesista_id]);
    if (!aRows || aRows.length === 0) { const err = new Error('anestesista inexistente'); err.code = 'BAD_REQUEST'; throw err; }

    if (Object.prototype.hasOwnProperty.call(dados, 'cirurgiao_id') && dados.cirurgiao_id !== null && dados.cirurgiao_id !== undefined) {
      dados.cirurgiao_id = parseAndValidateId(dados.cirurgiao_id, 'cirurgiao_id');
      const [cRows] = await fastify.mysql.query('SELECT id FROM profissionais WHERE id = ? LIMIT 1', [dados.cirurgiao_id]);
      if (!cRows || cRows.length === 0) { const err = new Error('cirurgiao inexistente'); err.code = 'BAD_REQUEST'; throw err; }
    }

    try {
      const insertId = await repositorio.criar(fastify, dados);
      if (gerarNumero) {
        await repositorio.atualizar(fastify, insertId, { numero_prontuario: numeroAutomatico(insertId) });
      }
      const row = await repositorio.buscarPorId(fastify, insertId);
      return module.exports._serialize(row);
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        const e = new Error('numero_prontuario_duplicado'); e.code = 'DUPLICATE'; throw e;
      }
      throw err;
    }
  },

  async atualizar(fastify, id, dados) {
    // nao permitir campos proibidos
    if (!dados || Object.keys(dados).length === 0) {
      const err = new Error('body vazio'); err.code = 'BAD_REQUEST'; throw err;
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'id')) {
      const err = new Error('nao é permitido alterar id'); err.code = 'BAD_REQUEST'; throw err;
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'criado_em')) {
      const err = new Error('nao é permitido alterar criado_em'); err.code = 'BAD_REQUEST'; throw err;
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'anestesista_id')) {
      // manter a semântica atual: presença da chave exige valor válido (null não é aceito aqui)
      dados.anestesista_id = parseAndValidateId(dados.anestesista_id, 'anestesista_id');
      const [aRows] = await fastify.mysql.query('SELECT id FROM profissionais WHERE id = ? LIMIT 1', [dados.anestesista_id]);
      if (!aRows || aRows.length === 0) { const err = new Error('anestesista inexistente'); err.code = 'BAD_REQUEST'; throw err; }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'clinica_id')) {
      if (dados.clinica_id !== null && dados.clinica_id !== undefined) {
        dados.clinica_id = parseAndValidateId(dados.clinica_id, 'clinica_id');
        const [rows] = await fastify.mysql.query('SELECT id FROM clinicas WHERE id = ? LIMIT 1', [dados.clinica_id]);
        if (!rows || rows.length === 0) { const err = new Error('clinica inexistente'); err.code = 'BAD_REQUEST'; throw err; }
      }
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'cirurgiao_id')) {
      if (dados.cirurgiao_id !== null && dados.cirurgiao_id !== undefined) {
        dados.cirurgiao_id = parseAndValidateId(dados.cirurgiao_id, 'cirurgiao_id');
        const [cRows] = await fastify.mysql.query('SELECT id FROM profissionais WHERE id = ? LIMIT 1', [dados.cirurgiao_id]);
        if (!cRows || cRows.length === 0) { const err = new Error('cirurgiao inexistente'); err.code = 'BAD_REQUEST'; throw err; }
      }
    }

    const affected = await repositorio.atualizar(fastify, id, dados);
    if (affected === 0) return null;
    const row = await repositorio.buscarPorId(fastify, id);
    return module.exports._serialize(row);
  }
};
