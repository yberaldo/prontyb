import { apiGet } from './client';
import type {
  AnexoProntuario,
  FluidoterapiaProntuario,
  MedicacaoProntuario,
  MonitorizacaoProntuario,
  ProntuarioAnestesico,
} from '../types/api';

const prontuarioPath = (id: number) => `/prontuarios_anestesicos/${encodeURIComponent(String(id))}`;

export function listarProntuarios() {
  return apiGet<ProntuarioAnestesico[]>('/prontuarios_anestesicos');
}

export function buscarProntuario(id: number) {
  return apiGet<ProntuarioAnestesico>(prontuarioPath(id));
}

export function listarMedicacoes(id: number) {
  return apiGet<MedicacaoProntuario[]>(`${prontuarioPath(id)}/medicacoes`);
}

export function listarFluidoterapias(id: number) {
  return apiGet<FluidoterapiaProntuario[]>(`${prontuarioPath(id)}/fluidoterapias`);
}

export function listarAnexos(id: number) {
  return apiGet<AnexoProntuario[]>(`${prontuarioPath(id)}/anexos`);
}

export function listarMonitorizacoes(id: number) {
  return apiGet<MonitorizacaoProntuario[]>(`${prontuarioPath(id)}/monitorizacoes`);
}
