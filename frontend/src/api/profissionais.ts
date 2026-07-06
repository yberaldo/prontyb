import { apiGet } from './client';
import type { Profissional } from '../types/api';

export function listarAnestesistas() {
  return apiGet<Profissional[]>('/profissionais/anestesistas');
}

export function listarCirurgioes() {
  return apiGet<Profissional[]>('/profissionais/cirurgioes');
}
