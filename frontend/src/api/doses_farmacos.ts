import { apiGet } from './client';
import type { DoseFarmaco } from '../types/api';

interface ListarDosesFiltros {
  ativo?: boolean | number | null;
}

export function listarDosesPorFarmaco(farmacoId: number, filtros: ListarDosesFiltros = {}) {
  const params = new URLSearchParams();

  if (typeof filtros.ativo !== 'undefined' && filtros.ativo !== null) {
    params.set('ativo', filtros.ativo ? '1' : '0');
  }

  const query = params.toString();
  return apiGet<DoseFarmaco[]>(`/doses_farmacos/farmaco/${encodeURIComponent(String(farmacoId))}${query ? `?${query}` : ''}`);
}
