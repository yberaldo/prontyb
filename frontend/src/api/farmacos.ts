import { apiGet } from './client';
import type { Farmaco } from '../types/api';

interface ListarFarmacosFiltros {
  busca?: string | null;
  ativo?: boolean | number | null;
  categoria_chave?: string | null;
}

export function listarFarmacos(filtros: ListarFarmacosFiltros = {}) {
  const params = new URLSearchParams();

  if (typeof filtros.busca === 'string' && filtros.busca.trim()) {
    params.set('busca', filtros.busca.trim());
  }

  if (typeof filtros.ativo !== 'undefined' && filtros.ativo !== null) {
    params.set('ativo', filtros.ativo ? '1' : '0');
  }

  if (typeof filtros.categoria_chave === 'string' && filtros.categoria_chave.trim()) {
    params.set('categoria_chave', filtros.categoria_chave.trim());
  }

  const query = params.toString();
  return apiGet<Farmaco[]>(`/farmacos${query ? `?${query}` : ''}`);
}

export function listarFarmacosPorCategoria(categoriaChave: string) {
  return listarFarmacos({ ativo: true, categoria_chave: categoriaChave });
}
