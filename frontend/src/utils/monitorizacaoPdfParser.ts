import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { MonitorizacaoCampoClinico } from '../types/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TOLERANCIA_VERTICAL_PONTOS = 2.5;
const CABECALHOS_TREND_TABLE = [
  'HR', 'RR', 'SpO2', 'PR', 'PVI', 'Temp1', 'Temp2', 'Sys', 'Dia', 'Mean',
  'IBP1s', 'IBP1m', 'IBP1d', 'IBP2s', 'IBP2m', 'IBP2d', 'AwRR', 'EtCO2', 'FiCO2', 'GAS',
] as const;

const MAPA_CAMPOS: Partial<Record<(typeof CABECALHOS_TREND_TABLE)[number], MonitorizacaoCampoClinico>> = {
  PR: 'fc_bpm',
  AwRR: 'fr_rpm',
  SpO2: 'spo2_percent',
  Sys: 'pressao_sis_mmhg',
  Dia: 'pressao_dias_mmhg',
  Mean: 'pressao_media_mmhg',
  EtCO2: 'etco2_mmhg',
  FiCO2: 'fico2_mmhg',
  GAS: 'gas_mmhg',
  Temp1: 'temp1_c',
  Temp2: 'temp2_c',
};

interface TextoPosicionado {
  texto: string;
  x: number;
  y: number;
}

interface LinhaPdf {
  y: number;
  itens: TextoPosicionado[];
}

export interface LinhaMonitorizacaoExtraida {
  ordem: number;
  data_medicao: string;
  horario: string;
  dados: Partial<Record<MonitorizacaoCampoClinico, number>>;
  invalidos: Partial<Record<MonitorizacaoCampoClinico, string>>;
  avisos: string[];
}

export interface ResultadoParserMonitorizacao {
  data: string | null;
  paginas: number;
  linhas: LinhaMonitorizacaoExtraida[];
  avisos: string[];
  erro: string | null;
}

function textoPosicionado(item: TextItem): TextoPosicionado | null {
  const texto = item.str.trim();
  if (!texto) return null;
  return { texto, x: item.transform[4], y: item.transform[5] };
}

function agruparPorLinha(itens: TextoPosicionado[]): LinhaPdf[] {
  const linhas: LinhaPdf[] = [];
  const ordenados = [...itens].sort((a, b) => b.y - a.y || a.x - b.x);

  for (const item of ordenados) {
    const linha = linhas.find((candidata) => Math.abs(candidata.y - item.y) <= TOLERANCIA_VERTICAL_PONTOS);
    if (linha) {
      linha.itens.push(item);
      continue;
    }
    linhas.push({ y: item.y, itens: [item] });
  }

  return linhas.map((linha) => ({ ...linha, itens: linha.itens.sort((a, b) => a.x - b.x) }));
}

function normalizarData(valor: string): string | null {
  const match = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(valor);
  if (!match) return null;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function extrairDataCabecalho(itens: TextoPosicionado[], yCabecalho: number): string | null {
  for (const item of itens.filter((candidata) => (
    candidata.x <= 72 && Math.abs(candidata.y - yCabecalho) <= 28
  ))) {
    const completa = normalizarData(item.texto);
    if (completa) return completa;

    const inicio = /^(\d{4})-$/.exec(item.texto);
    if (!inicio) continue;
    const fim = itens.find((candidata) => (
      /^\d{2}-\d{2}$/.test(candidata.texto)
      && Math.abs(candidata.x - item.x) <= 6
      && candidata.y < item.y
      && item.y - candidata.y <= 28
    ));
    if (fim) return normalizarData(`${inicio[1]}-${fim.texto}`);
  }
  return null;
}

function normalizarHorario(valor: string): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(valor);
  if (!match) return null;
  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  const segundo = typeof match[3] === 'undefined' ? 0 : Number(match[3]);
  if (hora > 23 || minuto > 59 || segundo > 59) return null;
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:${String(segundo).padStart(2, '0')}`;
}

function numeroValido(valor: string): number | null {
  const normalizado = valor.replace(',', '.');
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalizado)) return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

function paginaInvalida(paginas: number, mensagem: string): ResultadoParserMonitorizacao {
  return { data: null, paginas, linhas: [], avisos: [mensagem], erro: mensagem };
}

function localizarCabecalhos(itens: TextoPosicionado[], largura: number): Map<string, TextoPosicionado> | null {
  const candidatos = new Map<string, TextoPosicionado[]>();
  for (const cabecalho of CABECALHOS_TREND_TABLE) candidatos.set(cabecalho, []);
  for (const item of itens) {
    const lista = candidatos.get(item.texto);
    if (lista) lista.push(item);
  }

  const referencia = candidatos.get('PR')?.find((pr) => (
    CABECALHOS_TREND_TABLE.every((cabecalho) => (
      candidatos.get(cabecalho)?.some((item) => Math.abs(item.y - pr.y) <= TOLERANCIA_VERTICAL_PONTOS)
    ))
  ));
  if (!referencia) return null;

  const cabecalhos = new Map<string, TextoPosicionado>();
  for (const cabecalho of CABECALHOS_TREND_TABLE) {
    const item = candidatos.get(cabecalho)?.find((candidata) => (
      Math.abs(candidata.y - referencia.y) <= TOLERANCIA_VERTICAL_PONTOS
    ));
    if (!item) return null;
    cabecalhos.set(cabecalho, item);
  }

  const posicoes = CABECALHOS_TREND_TABLE.map((cabecalho) => cabecalhos.get(cabecalho)?.x ?? 0);
  const estritamenteCrescente = posicoes.every((x, indice) => indice === 0 || x > posicoes[indice - 1]);
  const espacamentosCoerentes = posicoes.every((x, indice) => (
    indice === 0 || (x - posicoes[indice - 1] >= 12 && x - posicoes[indice - 1] <= 32)
  ));
  const pr = cabecalhos.get('PR');
  const gas = cabecalhos.get('GAS');
  if (!estritamenteCrescente || !espacamentosCoerentes || !pr || !gas || pr.x < largura * 0.2 || gas.x < largura * 0.85) {
    return null;
  }
  return cabecalhos;
}

function campoParaX(
  x: number,
  cabecalhos: Map<string, TextoPosicionado>,
): MonitorizacaoCampoClinico | null {
  const posicoes = CABECALHOS_TREND_TABLE.map((cabecalho) => cabecalhos.get(cabecalho) as TextoPosicionado);
  for (let indice = 0; indice < posicoes.length; indice += 1) {
    const atual = posicoes[indice];
    const anterior = posicoes[indice - 1];
    const proximo = posicoes[indice + 1];
    const inicio = anterior ? (anterior.x + atual.x) / 2 : atual.x - 14;
    const fim = proximo ? (atual.x + proximo.x) / 2 : atual.x + 18;
    if (x < inicio || x >= fim) continue;
    return MAPA_CAMPOS[CABECALHOS_TREND_TABLE[indice]] ?? null;
  }
  return null;
}

function extrairPagina(
  itens: TextoPosicionado[],
  largura: number,
  ordemInicial: number,
): { data: string; linhas: LinhaMonitorizacaoExtraida[] } | null {
  if (!itens.some((item) => item.texto === 'Trend Table')) return null;
  const cabecalhos = localizarCabecalhos(itens, largura);
  const yCabecalho = cabecalhos?.get('PR')?.y;
  const data = typeof yCabecalho === 'number' ? extrairDataCabecalho(itens, yCabecalho) : null;
  if (!data || !cabecalhos) return null;

  const xHoraLimite = (cabecalhos.get('HR')?.x ?? 0) - 12;
  if (typeof yCabecalho !== 'number') return null;

  const linhas: LinhaMonitorizacaoExtraida[] = [];
  for (const linha of agruparPorLinha(itens.filter((item) => item.y < yCabecalho - 12))) {
    const horarios = linha.itens
      .filter((item) => item.x < xHoraLimite)
      .map((item) => normalizarHorario(item.texto))
      .filter((horario): horario is string => horario !== null);
    if (horarios.length === 0) continue;
    if (horarios.length !== 1) return null;

    const dados: Partial<Record<MonitorizacaoCampoClinico, number>> = {};
    const invalidos: Partial<Record<MonitorizacaoCampoClinico, string>> = {};
    let ambiguo = false;
    for (const item of linha.itens) {
      if (item.x < xHoraLimite || item.texto === '---') continue;
      const campo = campoParaX(item.x, cabecalhos);
      if (!campo) continue;
      if (Object.prototype.hasOwnProperty.call(dados, campo) || Object.prototype.hasOwnProperty.call(invalidos, campo)) {
        ambiguo = true;
        break;
      }
      const numero = numeroValido(item.texto);
      if (numero === null) {
        invalidos[campo] = 'Valor nao numerico';
      } else if (numero < 0 || (campo === 'spo2_percent' && numero > 100)) {
        dados[campo] = numero;
        invalidos[campo] = campo === 'spo2_percent' ? 'SpO2 deve estar entre 0 e 100' : 'Valores negativos nao sao permitidos';
      } else if (campo !== 'gas_mmhg' || numero !== 0) {
        dados[campo] = numero;
      }
    }
    if (ambiguo) return null;

    const avisos: string[] = [];
    if (
      typeof dados.pressao_sis_mmhg === 'number'
      && typeof dados.pressao_dias_mmhg === 'number'
      && dados.pressao_sis_mmhg < dados.pressao_dias_mmhg
    ) {
      avisos.push('Pressao sistolica menor que a diastolica');
    }
    linhas.push({
      ordem: ordemInicial + linhas.length,
      data_medicao: data,
      horario: horarios[0],
      dados,
      invalidos,
      avisos,
    });
  }
  return { data, linhas };
}

export async function analisarPdfMonitorizacao(arquivo: File): Promise<ResultadoParserMonitorizacao> {
  try {
    const dadosArquivo = new Uint8Array(await arquivo.arrayBuffer());
    const documento = await pdfjsLib.getDocument({ data: dadosArquivo, isEvalSupported: false }).promise;
    const numeroPaginas = documento.numPages;
    const linhas: LinhaMonitorizacaoExtraida[] = [];
    const datas = new Set<string>();

    for (let numeroPagina = 1; numeroPagina <= documento.numPages; numeroPagina += 1) {
      const pagina = await documento.getPage(numeroPagina);
      const conteudo = await pagina.getTextContent();
      const itens = conteudo.items
        .filter((item): item is TextItem => 'str' in item)
        .map(textoPosicionado)
        .filter((item): item is TextoPosicionado => item !== null);
      const extraida = extrairPagina(itens, pagina.getViewport({ scale: 1 }).width, linhas.length);
      if (!extraida) {
        await documento.destroy();
        return paginaInvalida(numeroPaginas, 'O PDF nao corresponde ao layout Trend Table esperado ou possui linhas ambiguas.');
      }
      datas.add(extraida.data);
      linhas.push(...extraida.linhas);
    }
    await documento.destroy();

    const horarios = new Set<string>();
    for (const linha of linhas) {
      const chave = `${linha.data_medicao}T${linha.horario}`;
      if (horarios.has(chave)) {
        return paginaInvalida(numeroPaginas, 'O PDF possui horarios duplicados e nao pode ser importado com seguranca.');
      }
      horarios.add(chave);
    }
    if (linhas.length === 0) return paginaInvalida(numeroPaginas, 'Nenhum horario foi encontrado na tabela Trend Table.');

    return {
      data: datas.size === 1 ? [...datas][0] : null,
      paginas: numeroPaginas,
      linhas,
      avisos: [...new Set(linhas.flatMap((linha) => linha.avisos))],
      erro: null,
    };
  } catch {
    return { data: null, paginas: 0, linhas: [], avisos: [], erro: 'Nao foi possivel ler este PDF.' };
  }
}
