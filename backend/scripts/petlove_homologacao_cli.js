'use strict'

const readline = require('node:readline');

const TIMEOUT_PADRAO_MS = 5000;
const TIMEOUT_MINIMO_MS = 1000;
const TIMEOUT_MAXIMO_MS = 15000;

const EXIT_CODES = Object.freeze({
  SUCESSO: 0,
  VALIDACAO: 1,
  NAO_CONFIGURADA: 2,
  NAO_AUTORIZADA: 3,
  NAO_ENCONTRADO: 4,
  RESPOSTA_INVALIDA: 5,
  INDISPONIVEL: 6,
  INESPERADO: 9
});

const ERROS_SEGUROS = Object.freeze({
  PETLOVE_NAO_CONFIGURADA: Object.freeze({
    exitCode: EXIT_CODES.NAO_CONFIGURADA,
    mensagem: 'Busca Petlove nao configurada'
  }),
  PETLOVE_NAO_AUTORIZADA: Object.freeze({
    exitCode: EXIT_CODES.NAO_AUTORIZADA,
    mensagem: 'Acesso Petlove nao autorizado'
  }),
  PACIENTE_NAO_ENCONTRADO: Object.freeze({
    exitCode: EXIT_CODES.NAO_ENCONTRADO,
    mensagem: 'Paciente nao encontrado na Petlove'
  }),
  PETLOVE_RESPOSTA_INVALIDA: Object.freeze({
    exitCode: EXIT_CODES.RESPOSTA_INVALIDA,
    mensagem: 'Resposta Petlove invalida'
  }),
  PETLOVE_INDISPONIVEL: Object.freeze({
    exitCode: EXIT_CODES.INDISPONIVEL,
    mensagem: 'Busca Petlove temporariamente indisponivel'
  })
});

const CAMPOS_NORMALIZADOS_PERMITIDOS = Object.freeze([
  'origem_paciente',
  'microchip',
  'nome_animal',
  'especie',
  'raca',
  'sexo',
  'data_nascimento',
  'idade',
  'peso',
  'nome_tutor'
]);

class ErroValidacaoCli extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroValidacaoCli';
    this.code = 'VALIDACAO_LOCAL';
  }
}

function validarBaseUrlHttps(valor) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) {
    throw new ErroValidacaoCli('PETLOVE_BASE_URL e obrigatoria');
  }

  try {
    const url = new URL(texto);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('URL rejeitada');
    }
    return url.toString().replace(/\/+$/, '');
  } catch (_) {
    throw new ErroValidacaoCli('PETLOVE_BASE_URL deve ser uma URL HTTPS valida');
  }
}

function validarCookie(valor) {
  const cookie = typeof valor === 'string' ? valor.trim() : '';
  if (!cookie) {
    throw new ErroValidacaoCli('PETLOVE_AUTH_COOKIE e obrigatorio');
  }
  return cookie;
}

function validarMicrochip(valor) {
  const microchip = typeof valor === 'string' ? valor.trim() : '';
  if (!microchip) {
    throw new ErroValidacaoCli('Microchip e obrigatorio');
  }
  if (microchip.length > 40) {
    throw new ErroValidacaoCli('Microchip deve ter no maximo 40 caracteres');
  }
  return microchip;
}

function validarTimeout(valor) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) return TIMEOUT_PADRAO_MS;

  const timeoutMs = Number(texto);
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < TIMEOUT_MINIMO_MS ||
    timeoutMs > TIMEOUT_MAXIMO_MS
  ) {
    throw new ErroValidacaoCli(
      `Timeout deve ser um inteiro entre ${TIMEOUT_MINIMO_MS} e ${TIMEOUT_MAXIMO_MS} ms`
    );
  }
  return timeoutMs;
}

function mascararMicrochip(valor) {
  const microchip = typeof valor === 'string' ? valor.trim() : '';
  if (!microchip) return '';
  if (microchip.length <= 2) return '*'.repeat(microchip.length);
  if (microchip.length <= 8) {
    return `${microchip[0]}${'*'.repeat(microchip.length - 2)}${microchip.at(-1)}`;
  }
  return `${microchip.slice(0, 3)}${'*'.repeat(microchip.length - 6)}${microchip.slice(-3)}`;
}

function valorPresente(valor) {
  return valor !== null && valor !== undefined && valor !== '';
}

function criarResumoSanitizado(paciente) {
  const dados = paciente && typeof paciente === 'object' ? paciente : {};
  const camposNormalizados = CAMPOS_NORMALIZADOS_PERMITIDOS.filter(
    campo => Object.prototype.hasOwnProperty.call(dados, campo)
  );

  return Object.freeze({
    ok: true,
    especie: valorPresente(dados.especie) ? dados.especie : null,
    sexo: valorPresente(dados.sexo) ? dados.sexo : null,
    peso_presente: valorPresente(dados.peso),
    nome_animal_presente: valorPresente(dados.nome_animal),
    tutor_presente: valorPresente(dados.nome_tutor),
    nascimento_presente: valorPresente(dados.data_nascimento),
    microchip_mascarado: mascararMicrochip(dados.microchip),
    campos_normalizados: camposNormalizados
  });
}

function escreverLinha(destino, chave, valor) {
  const texto = Array.isArray(valor)
    ? valor.join(',')
    : valor === null
      ? 'null'
      : String(valor);
  destino.write(`${chave}=${texto}\n`);
}

function imprimirResumo(resumo, destino = process.stdout) {
  for (const [chave, valor] of Object.entries(resumo)) {
    escreverLinha(destino, chave, valor);
  }
}

function obterErroSeguro(erro) {
  if (erro instanceof ErroValidacaoCli) {
    return {
      exitCode: EXIT_CODES.VALIDACAO,
      codigo: erro.code,
      mensagem: erro.message
    };
  }

  const conhecido = erro && ERROS_SEGUROS[erro.code];
  if (conhecido) {
    return {
      exitCode: conhecido.exitCode,
      codigo: erro.code,
      mensagem: conhecido.mensagem
    };
  }

  return {
    exitCode: EXIT_CODES.INESPERADO,
    codigo: 'ERRO_INESPERADO',
    mensagem: 'Falha inesperada na homologacao Petlove'
  };
}

function imprimirErro(erroSeguro, destino = process.stderr) {
  escreverLinha(destino, 'ok', false);
  escreverLinha(destino, 'codigo', erroSeguro.codigo);
  escreverLinha(destino, 'mensagem', erroSeguro.mensagem);
}

async function perguntarVisivel(pergunta) {
  const interfaceLeitura = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    historySize: 0
  });

  try {
    return await new Promise(resolve => interfaceLeitura.question(pergunta, resolve));
  } finally {
    interfaceLeitura.close();
  }
}

async function perguntarCookieOculto(pergunta) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    process.stdout.write(pergunta);
    return await new Promise((resolve, reject) => {
      const interfaceLeitura = readline.createInterface({
        input: process.stdin,
        terminal: false,
        historySize: 0
      });
      interfaceLeitura.once('line', linha => {
        interfaceLeitura.close();
        resolve(linha);
      });
      interfaceLeitura.once('error', reject);
    });
  }

  process.stdout.write(pergunta);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return await new Promise((resolve, reject) => {
    let segredo = '';

    const finalizar = (erro) => {
      process.stdin.off('data', aoReceberDados);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (erro) reject(erro);
      else resolve(segredo);
    };

    const aoReceberDados = buffer => {
      const entrada = buffer.toString('utf8');
      for (const caractere of entrada) {
        if (caractere === '\r' || caractere === '\n') {
          finalizar();
          return;
        }
        if (caractere === '\u0003' || caractere === '\u0004') {
          finalizar(new ErroValidacaoCli('Operacao cancelada'));
          return;
        }
        if (caractere === '\u007f' || caractere === '\b') {
          segredo = segredo.slice(0, -1);
          continue;
        }
        if (caractere >= ' ') segredo += caractere;
      }
    };

    process.stdin.on('data', aoReceberDados);
  });
}

async function executar() {
  const baseUrl = validarBaseUrlHttps(await perguntarVisivel('PETLOVE_BASE_URL (HTTPS): '));
  let authCookie = validarCookie(await perguntarCookieOculto('PETLOVE_AUTH_COOKIE (oculto): '));
  const microchip = validarMicrochip(await perguntarVisivel('Microchip para teste: '));
  const timeoutMs = validarTimeout(
    await perguntarVisivel(`Timeout em ms [${TIMEOUT_PADRAO_MS}]: `)
  );

  process.env.PETLOVE_BUSCA_HABILITADA = 'true';
  process.env.PETLOVE_BASE_URL = baseUrl;
  process.env.PETLOVE_AUTH_COOKIE = authCookie;
  process.env.PETLOVE_TIMEOUT_MS = String(timeoutMs);
  authCookie = null;

  const { buscarPorMicrochip } = require('../src/servicos/petlove_consulta.servico');
  const paciente = await buscarPorMicrochip(microchip);
  imprimirResumo(criarResumoSanitizado(paciente));
  return EXIT_CODES.SUCESSO;
}

if (require.main === module) {
  executar()
    .then(exitCode => {
      process.exitCode = exitCode;
    })
    .catch(erro => {
      const seguro = obterErroSeguro(erro);
      imprimirErro(seguro);
      process.exitCode = seguro.exitCode;
    });
}

module.exports = {
  ErroValidacaoCli,
  criarResumoSanitizado,
  mascararMicrochip,
  obterErroSeguro,
  validarBaseUrlHttps,
  validarMicrochip,
  validarTimeout
};
