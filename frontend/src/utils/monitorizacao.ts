import type {
  MonitorizacaoCampoClinico,
  MonitorizacaoColuna,
  MonitorizacaoLinha,
} from '../types/api';

export const COLUNAS_MONITORIZACAO: readonly MonitorizacaoColuna[] = [
  { key: 'fc_bpm', label: 'FC', unidade: 'bpm', origem: 'PR' },
  { key: 'fr_rpm', label: 'FR', unidade: 'rpm', origem: 'AwRR' },
  { key: 'spo2_percent', label: 'SpO2', unidade: '%', origem: 'SpO2' },
  { key: 'pressao_sis_mmhg', label: 'P. Sis', unidade: 'mmHg', origem: 'Sys' },
  { key: 'pressao_dias_mmhg', label: 'P. Dias', unidade: 'mmHg', origem: 'Dia' },
  { key: 'pressao_media_mmhg', label: 'P. Media', unidade: 'mmHg', origem: 'Mean' },
  { key: 'etco2_mmhg', label: 'EtCO2', unidade: 'mmHg', origem: 'EtCO2' },
  { key: 'fico2_mmhg', label: 'FiCO2', unidade: 'mmHg', origem: 'FiCO2' },
  { key: 'gas_mmhg', label: 'CAM', unidade: '%', origem: 'GAS' },
  { key: 'temp1_c', label: 'Temp1', unidade: 'C', origem: 'Temp1' },
  { key: 'temp2_c', label: 'Temp2', unidade: 'C', origem: 'Temp2' },
];

export function isMonitorizacaoCampo(value: string): value is MonitorizacaoCampoClinico {
  return COLUNAS_MONITORIZACAO.some((coluna) => coluna.key === value);
}

export function getMonitorizacaoColuna(key: MonitorizacaoCampoClinico): MonitorizacaoColuna {
  const coluna = COLUNAS_MONITORIZACAO.find((item) => item.key === key);
  if (!coluna) throw new Error(`Coluna de monitorizacao desconhecida: ${key}`);
  return coluna;
}

export function normalizarDadosMonitorizacao(
  dados: MonitorizacaoLinha['dados_json'],
): Partial<Record<MonitorizacaoCampoClinico, number>> {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return {};

  const normalizados: Partial<Record<MonitorizacaoCampoClinico, number>> = {};
  for (const [key, value] of Object.entries(dados)) {
    if (!isMonitorizacaoCampo(key) || typeof value !== 'number' || !Number.isFinite(value)) continue;
    normalizados[key] = value;
  }
  return normalizados;
}

export function temValorTemperatura(
  linhas: Array<Pick<MonitorizacaoLinha, 'dados_json'>>,
  key: 'temp1_c' | 'temp2_c',
): boolean {
  return linhas.some((linha) => typeof normalizarDadosMonitorizacao(linha.dados_json)[key] === 'number');
}

export function colunasVisiveisMonitorizacao(
  linhas: Array<Pick<MonitorizacaoLinha, 'dados_json'>>,
): MonitorizacaoColuna[] {
  return COLUNAS_MONITORIZACAO.filter((coluna) => {
    if (coluna.key === 'temp1_c' || coluna.key === 'temp2_c') {
      return temValorTemperatura(linhas, coluna.key);
    }
    return true;
  });
}

export function formatarValorMonitorizacao(
  key: MonitorizacaoCampoClinico,
  value: number | undefined,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  if (key === 'gas_mmhg') {
    if (value === 0) return '';
    return ((value / 760) * 100).toFixed(2);
  }
  return String(value);
}
