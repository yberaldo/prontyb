'use strict'

const servico = require('../servicos/anexos_prontuario.servico');
const { LIMITE_TAMANHO_UPLOAD_ANEXO_BYTES } = require('../utilitarios/arquivos_upload');

function isPositiveIntValue(v) {
  const n = parseInt(v, 10);
  return !isNaN(n) && n > 0;
}

async function extrairUploadMultipart(request) {
  let tipo_anexo = null;
  let arquivo = null;
  let arquivosRecebidos = 0;

  const partes = request.parts({
    limits: {
      fileSize: LIMITE_TAMANHO_UPLOAD_ANEXO_BYTES,
      files: 2,
      fields: 5,
      parts: 8,
      fieldSize: 255
    },
    throwFileSizeLimit: true
  });

  for await (const parte of partes) {
    if (parte.type === 'field') {
      if (parte.fieldname === 'tipo_anexo') {
        if (parte.valueTruncated) {
          const err = new Error('tipo_anexo invalido');
          err.code = 'BAD_REQUEST';
          throw err;
        }
        tipo_anexo = typeof parte.value === 'string' ? parte.value.trim() : String(parte.value || '').trim();
      }
      continue;
    }

    if (parte.type === 'file') {
      arquivosRecebidos += 1;
      const buffer = await parte.toBuffer();

      if (parte.fieldname === 'arquivo' && !arquivo) {
        arquivo = {
          nome_original: parte.filename || 'arquivo',
          mime_type: parte.mimetype,
          buffer
        };
      }
    }
  }

  if (arquivosRecebidos > 1) {
    const err = new Error('apenas um arquivo pode ser enviado');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  return { tipo_anexo, arquivo };
}

module.exports = {
  async listar(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      const dados = await servico.listarPorProntuarioId(request.server, Number(prontuario_id));
      return reply.send({ ok: true, dados });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro listando anexos');
      if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async buscar(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      const anexo_id = request.params.anexo_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      if (!isPositiveIntValue(anexo_id)) return reply.code(400).send({ ok: false, mensagem: 'anexo_id invalido' });
      const dados = await servico.buscarPorId(request.server, Number(prontuario_id), Number(anexo_id));
      return reply.send({ ok: true, dados });
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro buscando anexo');
      if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
      if (err && err.code === 'BAD_REQUEST') return reply.code(400).send({ ok: false, mensagem: err.message });
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async criar(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      const body = request.body || {};
      try {
        const criado = await servico.criar(request.server, Number(prontuario_id), body);
        return reply.code(201).send({ ok: true, dados: criado });
      } catch (err) {
        if (err && err.code === 'BAD_REQUEST') return reply.code(400).send({ ok: false, mensagem: err.message });
        if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
        throw err;
      }
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro criando anexo');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async upload(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      if (typeof request.isMultipart === 'function' && !request.isMultipart()) {
        return reply.code(400).send({ ok: false, mensagem: 'content-type multipart/form-data obrigatorio' });
      }

      let dadosUpload;
      try {
        dadosUpload = await extrairUploadMultipart(request);
      } catch (err) {
        if (err && err.code === 'FST_REQ_FILE_TOO_LARGE') {
          return reply.code(413).send({ ok: false, mensagem: 'arquivo excede limite de 20 MB' });
        }
        if (err && (err.code === 'FST_PARTS_LIMIT' || err.code === 'FST_FIELDS_LIMIT' || err.code === 'FST_FILES_LIMIT')) {
          return reply.code(400).send({ ok: false, mensagem: 'multipart invalido' });
        }
        throw err;
      }

      try {
        const criado = await servico.criarUpload(request.server, Number(prontuario_id), dadosUpload);
        return reply.code(201).send({ ok: true, dados: criado });
      } catch (err) {
        if (err && err.code === 'BAD_REQUEST') return reply.code(400).send({ ok: false, mensagem: err.message });
        if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
        throw err;
      }
    } catch (err) {
      if (err && err.code === 'BAD_REQUEST') return reply.code(400).send({ ok: false, mensagem: err.message });
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro realizando upload de anexo');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  },

  async remover(request, reply) {
    try {
      const prontuario_id = request.params.prontuario_id;
      const anexo_id = request.params.anexo_id;
      if (!isPositiveIntValue(prontuario_id)) return reply.code(400).send({ ok: false, mensagem: 'prontuario_id invalido' });
      if (!isPositiveIntValue(anexo_id)) return reply.code(400).send({ ok: false, mensagem: 'anexo_id invalido' });

      try {
        await servico.remover(request.server, Number(prontuario_id), Number(anexo_id));
        return reply.send({ ok: true, mensagem: 'anexo removido' });
      } catch (err) {
        if (err && err.code === 'NOT_FOUND') return reply.code(404).send({ ok: false, mensagem: err.message });
        throw err;
      }
    } catch (err) {
      request.log.error({ erro: err && err.message ? err.message : String(err) }, 'Erro removendo anexo');
      return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
    }
  }
};
