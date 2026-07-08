'use strict'

const servicoPadrao = require('../servicos/petlove_consulta.servico');

function criarErroValidacao(mensagem) {
  const err = new Error(mensagem);
  err.code = 'BAD_REQUEST';
  return err;
}

function isPlainObject(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

function validarPayload(body) {
  if (!isPlainObject(body)) {
    throw criarErroValidacao('body invalido');
  }

  if (Object.prototype.hasOwnProperty.call(body, 'petlove_id')) {
    throw criarErroValidacao('campo desconhecido no body');
  }

  const allowed = ['microchip'];
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) {
      throw criarErroValidacao('campo desconhecido no body');
    }
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'microchip')) {
    throw criarErroValidacao('microchip obrigatorio');
  }

  if (typeof body.microchip !== 'string') {
    throw criarErroValidacao('microchip invalido');
  }

  const microchip = body.microchip.trim();
  if (!microchip) {
    throw criarErroValidacao('microchip vazio');
  }

  if (microchip.length > 40) {
    throw criarErroValidacao('microchip muito longo');
  }

  return microchip;
}

function criarControladorPetlove(servico = servicoPadrao) {
  return {
    async buscarPorMicrochip(request, reply) {
      try {
        reply.header('Cache-Control', 'no-store');

        const microchip = validarPayload(request.body);
        const paciente = await servico.buscarPorMicrochip(microchip);

        return reply.code(200).send({
          ok: true,
          dados: paciente,
          warnings: [],
          meta: { fonte: 'petlove' }
        });
      } catch (err) {
        if (err && err.code === 'BAD_REQUEST') {
          return reply.code(400).send({ ok: false, mensagem: err.message });
        }

        if (err && err.code === servico.ERRO_PETLOVE_NAO_CONFIGURADA.code) {
          return reply.code(503).send({
            ok: false,
            codigo: servico.ERRO_PETLOVE_NAO_CONFIGURADA.code,
            mensagem: servico.ERRO_PETLOVE_NAO_CONFIGURADA.mensagem
          });
        }

        const erroPublico = err && servico.ERROS_PUBLICOS
          ? servico.ERROS_PUBLICOS[err.code]
          : null;
        if (erroPublico) {
          return reply.code(erroPublico.status).send({
            ok: false,
            codigo: erroPublico.code,
            mensagem: erroPublico.mensagem
          });
        }

        request.log.error({ erro: 'PETLOVE_ERRO_INTERNO' }, 'Erro na fronteira Petlove');
        return reply.code(500).send({ ok: false, mensagem: 'erro interno' });
      }
    }
  };
}

module.exports = {
  ...criarControladorPetlove(),
  criarControladorPetlove
};
