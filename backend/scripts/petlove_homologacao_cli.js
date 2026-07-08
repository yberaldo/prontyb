'use strict';

const readline = require('node:readline');
const { stdin, stdout } = require('node:process');

const DEFAULT_PETLOVE_BASE_URL = 'https://central-de-saude.petlove.com.br';
const DEFAULT_PETLOVE_TIMEOUT_MS = 15000;

function criarErroSanitizado(codigo, mensagem, exitCode) {
  const erro = new Error(mensagem);
  erro.codigo = codigo;
  erro.exitCode = exitCode;
  return erro;
}

function mascararMicrochip(microchip) {
  const texto = String(microchip ?? '').trim();

  if (!texto) {
    return '';
  }

  if (texto.length <= 4) {
    return `${texto[0] ?? ''}${texto.length > 1 ? '*'.repeat(Math.max(texto.length - 2, 0)) : ''}${texto.length > 1 ? texto[texto.length - 1] : ''}`;
  }

  const inicio = texto.slice(0, 3);
  const fim = texto.slice(-2);
  return `${inicio}${'*'.repeat(Math.max(texto.length - 5, 3))}${fim}`;
}

function validarBaseUrlPetlove(valor) {
  const texto = String(valor ?? '').trim();

  if (!texto) {
    return DEFAULT_PETLOVE_BASE_URL;
  }

  let url;

  try {
    url = new URL(texto);
  } catch {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'PETLOVE_BASE_URL invalida: informe uma URL HTTPS sem credenciais, query ou fragmento.',
      1,
    );
  }

  if (url.protocol !== 'https:') {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'PETLOVE_BASE_URL deve usar HTTPS.',
      1,
    );
  }

  if (url.username || url.password) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'PETLOVE_BASE_URL nao pode conter credenciais.',
      1,
    );
  }

  if (url.search) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'PETLOVE_BASE_URL nao pode conter query.',
      1,
    );
  }

  if (url.hash) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'PETLOVE_BASE_URL nao pode conter fragmento.',
      1,
    );
  }

  if (url.pathname && url.pathname !== '/') {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'PETLOVE_BASE_URL deve apontar apenas para a raiz da Central Petlove.',
      1,
    );
  }

  return url.origin;
}

function validarMicrochip(valor) {
  const texto = String(valor ?? '').trim();

  if (!texto) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'Microchip obrigatorio.',
      1,
    );
  }

  if (texto.length > 40) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'Microchip deve ter no maximo 40 caracteres.',
      1,
    );
  }

  return texto;
}

function validarTimeoutMs(valor) {
  const texto = String(valor ?? '').trim();

  if (!texto) {
    return DEFAULT_PETLOVE_TIMEOUT_MS;
  }

  const numero = Number.parseInt(texto, 10);

  if (!Number.isInteger(numero) || numero <= 0) {
    throw criarErroSanitizado(
      'VALIDACAO_LOCAL',
      'Timeout invalido.',
      1,
    );
  }

  return numero;
}

function perguntar(texto) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
    });

    rl.question(texto, (resposta) => {
      rl.close();
      resolve(resposta);
    });
  });
}

function perguntarOculto(texto) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    return perguntar(texto);
  }

  return new Promise((resolve, reject) => {
    let valor = '';
    let finalizado = false;

    const limpar = () => {
      stdin.off('data', aoReceberDado);
      stdin.pause();

      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
    };

    const finalizar = () => {
      if (finalizado) {
        return;
      }

      finalizado = true;
      limpar();
      stdout.write('\n');
      resolve(valor);
    };

    const abortar = () => {
      if (finalizado) {
        return;
      }

      finalizado = true;
      limpar();
      stdout.write('\n');
      reject(criarErroSanitizado('VALIDACAO_LOCAL', 'Entrada interrompida.', 1));
    };

    const aoReceberDado = (buffer) => {
      const entrada = buffer.toString('utf8');

      for (const caractere of entrada) {
        if (caractere === '\r' || caractere === '\n') {
          finalizar();
          return;
        }

        if (caractere === '\u0003' || caractere === '\u0004') {
          abortar();
          return;
        }

        if (caractere === '\u007f' || caractere === '\b') {
          valor = valor.slice(0, -1);
          continue;
        }

        valor += caractere;
      }
    };

    stdout.write(texto);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', aoReceberDado);
  });
}

function extrairValor(objeto, chaves) {
  if (!objeto || typeof objeto !== 'object') {
    return null;
  }

  for (const chave of chaves) {
    const valor = objeto[chave];

    if (valor !== undefined && valor !== null && `${valor}`.trim() !== '') {
      return valor;
    }
  }

  return null;
}

function temValor(objeto, chaves) {
  return extrairValor(objeto, chaves) !== null;
}

function listarCamposNormalizados(resultado) {
  if (!resultado || typeof resultado !== 'object') {
    return [];
  }

  const chavesSensiveis = new Set([
    'petlove_id',
    'petloveid',
    'microchip',
    'chip',
    'cookie',
    'authorization',
    'auth',
    'token',
    'senha',
    'password',
    'headers',
    'header',
    'response',
    'raw',
    'bruto',
    'tutor',
    'responsavel',
    'data_nascimento',
    'datanascimento',
    'nascimento',
    'nome_animal',
    'nomeanimal',
  ]);

  return Object.keys(resultado)
    .filter((chave) => !chavesSensiveis.has(String(chave).toLowerCase()))
    .sort();
}

function montarResumoSucesso(microchip, resultado) {
  return {
    ok: true,
    especie: extrairValor(resultado, ['especie']),
    sexo: extrairValor(resultado, ['sexo']),
    peso_presente: temValor(resultado, ['peso', 'peso_kg', 'pesoKg']),
    nome_animal_presente: temValor(resultado, ['nome_animal', 'nomeAnimal', 'nome']),
    tutor_presente: temValor(resultado, ['tutor', 'responsavel']),
    nascimento_presente: temValor(resultado, ['data_nascimento', 'dataNascimento', 'nascimento']),
    microchip_mascarado: mascararMicrochip(microchip),
    campos_normalizados: listarCamposNormalizados(resultado),
  };
}

function mapearCodigoErro(erro) {
  const codigo = String(erro?.codigo ?? erro?.code ?? '').toUpperCase();
  const status = Number(erro?.statusCode ?? erro?.status ?? erro?.response?.status);
  const mensagem = String(erro?.message ?? '').toLowerCase();

  if (codigo === 'PETLOVE_NAO_CONFIGURADA' || status === 503 || mensagem.includes('nao configurada')) {
    return { codigo: 'PETLOVE_NAO_CONFIGURADA', exitCode: 2, mensagem: 'Busca Petlove nao configurada' };
  }

  if (codigo === 'NAO_AUTORIZADA' || codigo === 'UNAUTHORIZED' || status === 401 || status === 403 || mensagem.includes('autoriz')) {
    return { codigo: 'PETLOVE_NAO_AUTORIZADA', exitCode: 3, mensagem: 'Petlove nao autorizada' };
  }

  if (codigo === 'PACIENTE_NAO_ENCONTRADO' || codigo === 'NAO_ENCONTRADO' || status === 404 || mensagem.includes('nao encontrado')) {
    return { codigo: 'PETLOVE_PACIENTE_NAO_ENCONTRADO', exitCode: 4, mensagem: 'Paciente nao encontrado' };
  }

  if (codigo === 'RESPOSTA_INVALIDA' || codigo === 'DADOS_INVALIDOS' || mensagem.includes('resposta invalida') || mensagem.includes('dados invalidos')) {
    return { codigo: 'PETLOVE_RESPOSTA_INVALIDA', exitCode: 5, mensagem: 'Resposta Petlove invalida' };
  }

  if (
    codigo === 'TIMEOUT'
    || codigo === 'ETIMEDOUT'
    || codigo === 'ECONNABORTED'
    || status === 408
    || status === 502
    || status === 503
    || status === 504
    || mensagem.includes('timeout')
  ) {
    return { codigo: 'PETLOVE_INDISPONIVEL', exitCode: 6, mensagem: 'Petlove indisponivel ou timeout' };
  }

  return { codigo: 'PETLOVE_ERRO_INESPERADO', exitCode: 9, mensagem: 'Erro inesperado sanitizado' };
}

function selecionarFuncaoConsulta(servico) {
  if (typeof servico === 'function') {
    return { fn: servico, contexto: null };
  }

  if (!servico || typeof servico !== 'object') {
    return null;
  }

  const nomesPreferidos = [
    'consultarPacientePetlove',
    'consultarPacientePorMicrochipPetlove',
    'buscarPacientePetlove',
    'buscarPacientePorMicrochipPetlove',
    'consultarPetlove',
    'buscarPetlove',
    'executarConsultaPetlove',
  ];

  for (const nome of nomesPreferidos) {
    if (typeof servico[nome] === 'function') {
      return { fn: servico[nome], contexto: servico };
    }
  }

  const entradaFuncional = Object.entries(servico).find(([, valor]) => typeof valor === 'function');

  return entradaFuncional ? { fn: entradaFuncional[1], contexto: servico } : null;
}

function carregarServicoConsultaPetlove() {
  const modulo = require('../src/servicos/petlove_consulta.servico');
  const consulta = selecionarFuncaoConsulta(modulo);

  if (!consulta) {
    throw criarErroSanitizado(
      'PETLOVE_ERRO_INESPERADO',
      'Servico Petlove de consulta nao encontrado.',
      9,
    );
  }

  return consulta;
}

function inferirModoChamadaConsulta(consulta) {
  const fonte = Function.prototype.toString.call(consulta);

  if (/\{\s*microchip\s*\}/i.test(fonte) || /\(\s*\{\s*microchip\s*\}/i.test(fonte)) {
    return 'objeto';
  }

  return 'string';
}

async function executarConsultaPetlove(consultaSelecionada, microchip) {
  const modo = inferirModoChamadaConsulta(consultaSelecionada.fn);
  const argumento = modo === 'objeto' ? { microchip } : microchip;
  const retorno = await consultaSelecionada.fn.call(consultaSelecionada.contexto, argumento);

  if (retorno && typeof retorno === 'object' && 'ok' in retorno && 'resultado' in retorno && retorno.ok === false) {
    throw Object.assign(new Error(retorno.mensagem ?? 'Erro Petlove.'), {
      codigo: retorno.codigo ?? 'PETLOVE_ERRO_INESPERADO',
      statusCode: retorno.statusCode,
    });
  }

  if (retorno && typeof retorno === 'object' && 'resultado' in retorno) {
    return retorno.resultado;
  }

  return retorno;
}

function imprimirJson(objeto) {
  stdout.write(`${JSON.stringify(objeto, null, 2)}\n`);
}

async function main() {
  try {
    const baseUrl = validarBaseUrlPetlove(
      await perguntar(`PETLOVE_BASE_URL (Enter para ${DEFAULT_PETLOVE_BASE_URL}): `),
    );
    const cookie = String(await perguntarOculto('PETLOVE_AUTH_COOKIE (entrada oculta): ')).trim();

    if (!cookie) {
      throw criarErroSanitizado(
        'VALIDACAO_LOCAL',
        'PETLOVE_AUTH_COOKIE obrigatorio.',
        1,
      );
    }

    const microchip = validarMicrochip(await perguntar('Microchip para teste: '));
    const timeoutMs = validarTimeoutMs(
      await perguntar(`Timeout em ms (Enter para ${DEFAULT_PETLOVE_TIMEOUT_MS}): `),
    );

    process.env.PETLOVE_BUSCA_HABILITADA = 'true';
    process.env.PETLOVE_BASE_URL = baseUrl;
    process.env.PETLOVE_AUTH_COOKIE = cookie;
    process.env.PETLOVE_TIMEOUT_MS = String(timeoutMs);

    const consulta = carregarServicoConsultaPetlove();
    const resultado = await executarConsultaPetlove(consulta, microchip);
    imprimirJson(montarResumoSucesso(microchip, resultado));
    return 0;
  } catch (erro) {
    if (erro && erro.codigo === 'VALIDACAO_LOCAL') {
      imprimirJson({
        ok: false,
        codigo: erro.codigo,
        mensagem: erro.message,
      });
      return erro.exitCode ?? 1;
    }

    const sanitizado = mapearCodigoErro(erro);
    imprimirJson({
      ok: false,
      codigo: sanitizado.codigo,
      mensagem: sanitizado.mensagem,
    });
    return sanitizado.exitCode;
  }
}

if (require.main === module) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

module.exports = {
  DEFAULT_PETLOVE_BASE_URL,
  DEFAULT_PETLOVE_TIMEOUT_MS,
  carregarServicoConsultaPetlove,
  executarConsultaPetlove,
  listarCamposNormalizados,
  main,
  mascararMicrochip,
  mapearCodigoErro,
  montarResumoSucesso,
  perguntar,
  perguntarOculto,
  validarBaseUrlPetlove,
  validarMicrochip,
  validarTimeoutMs,
};
