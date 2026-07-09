import { apiGet, apiPost, apiPut } from './client';
import type {
  AnexoProntuario,
  CriarProntuarioPayload,
  FluidoterapiaProntuario,
  FluidoterapiaProntuarioPayload,
  MedicacaoProntuario,
  MonitorizacaoProntuario,
  ProntuarioAnestesico,
} from '../types/api';

const prontuarioPath = (id: number) => `/prontuarios_anestesicos/${encodeURIComponent(String(id))}`;

export function listarProntuarios(busca?: string | null) {
  const termo = typeof busca === 'string' ? busca.trim() : '';
  const query = termo ? `?busca=${encodeURIComponent(termo)}` : '';
  return apiGet<ProntuarioAnestesico[]>(`/prontuarios_anestesicos${query}`);
}

export function buscarProntuario(id: number) {
  return apiGet<ProntuarioAnestesico>(prontuarioPath(id));
}

export function criarProntuario(payload: CriarProntuarioPayload) {
  return apiPost<ProntuarioAnestesico, CriarProntuarioPayload>('/prontuarios_anestesicos', payload);
}

export function listarMedicacoes(id: number) {
  return apiGet<MedicacaoProntuario[]>(`${prontuarioPath(id)}/medicacoes`);
}

export function listarFluidoterapias(id: number) {
  return apiGet<FluidoterapiaProntuario[]>(`${prontuarioPath(id)}/fluidoterapias`);
}

export function criarFluidoterapia(prontuarioId: number, payload: FluidoterapiaProntuarioPayload) {
  return apiPost<FluidoterapiaProntuario, FluidoterapiaProntuarioPayload>(
    `${prontuarioPath(prontuarioId)}/fluidoterapias`,
    payload,
  );
}

export function atualizarFluidoterapia(
  prontuarioId: number,
  fluidoterapiaId: number,
  payload: FluidoterapiaProntuarioPayload,
) {
  return apiPut<FluidoterapiaProntuario, FluidoterapiaProntuarioPayload>(
    `${prontuarioPath(prontuarioId)}/fluidoterapias/${encodeURIComponent(String(fluidoterapiaId))}`,
    payload,
  );
}

export function listarAnexos(id: number) {
  return apiGet<AnexoProntuario[]>(`${prontuarioPath(id)}/anexos`);
}

export function listarMonitorizacoes(id: number) {
  return apiGet<MonitorizacaoProntuario[]>(`${prontuarioPath(id)}/monitorizacoes`);
}
