import { apiGet } from './client';
import type { Clinica } from '../types/api';

export function listarClinicas() {
  return apiGet<Clinica[]>('/clinicas?ativo=1');
}
