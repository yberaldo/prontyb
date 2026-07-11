import { apiDelete, apiGet, apiPost, apiPostForm, apiPut } from './client';
import type {
  AnexoProntuario,
  AtualizarProntuarioPayload,
  CriarProntuarioPayload,
  FluidoterapiaProntuario,
  FluidoterapiaProntuarioPayload,
  ImportarMonitorizacaoConfirmadaPayload,
  MedicacaoProntuario,
  MedicacaoProntuarioPayload,
  MonitorizacaoProntuario,
  MonitorizacaoLinha,
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

export function atualizarProntuario(id: number, payload: AtualizarProntuarioPayload) {
  return apiPut<ProntuarioAnestesico, AtualizarProntuarioPayload>(prontuarioPath(id), payload);
}

export function listarMedicacoes(id: number) {
  return apiGet<MedicacaoProntuario[]>(`${prontuarioPath(id)}/medicacoes`);
}

export function criarMedicacao(prontuarioId: number, payload: MedicacaoProntuarioPayload) {
  return apiPost<MedicacaoProntuario, MedicacaoProntuarioPayload>(
    `${prontuarioPath(prontuarioId)}/medicacoes`,
    payload,
  );
}

export function atualizarMedicacao(
  prontuarioId: number,
  medicacaoId: number,
  payload: MedicacaoProntuarioPayload,
) {
  return apiPut<MedicacaoProntuario, MedicacaoProntuarioPayload>(
    `${prontuarioPath(prontuarioId)}/medicacoes/${encodeURIComponent(String(medicacaoId))}`,
    payload,
  );
}

export function removerMedicacao(prontuarioId: number, medicacaoId: number) {
  return apiDelete<void>(
    `${prontuarioPath(prontuarioId)}/medicacoes/${encodeURIComponent(String(medicacaoId))}`,
  );
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

export function removerFluidoterapia(prontuarioId: number, fluidoterapiaId: number) {
  return apiDelete<void>(
    `${prontuarioPath(prontuarioId)}/fluidoterapias/${encodeURIComponent(String(fluidoterapiaId))}`,
  );
}

export function listarAnexos(id: number) {
  return apiGet<AnexoProntuario[]>(`${prontuarioPath(id)}/anexos`);
}

export function listarMonitorizacoes(id: number) {
  return apiGet<MonitorizacaoProntuario[]>(`${prontuarioPath(id)}/monitorizacoes`);
}

export function listarMonitorizacoesRevisadas(id: number) {
  return apiGet<MonitorizacaoProntuario[]>(`${prontuarioPath(id)}/monitorizacoes?status=revisado`);
}

export function listarLinhasMonitorizacao(prontuarioId: number, monitorizacaoId: number) {
  return apiGet<MonitorizacaoLinha[]>(
    `${prontuarioPath(prontuarioId)}/monitorizacoes/${encodeURIComponent(String(monitorizacaoId))}/linhas`,
  );
}

export function enviarPdfMonitorizacao(prontuarioId: number, arquivo: File) {
  const formData = new FormData();
  formData.append('tipo_anexo', 'pdf_monitorizacao');
  formData.append('arquivo', arquivo, arquivo.name);
  return apiPostForm<AnexoProntuario>(`${prontuarioPath(prontuarioId)}/anexos/upload`, formData);
}

export function importarMonitorizacaoConfirmada(
  prontuarioId: number,
  monitorizacaoId: number,
  payload: ImportarMonitorizacaoConfirmadaPayload,
) {
  return apiPost<unknown, ImportarMonitorizacaoConfirmadaPayload>(
    `${prontuarioPath(prontuarioId)}/monitorizacoes/${encodeURIComponent(String(monitorizacaoId))}/importar-confirmadas`,
    payload,
  );
}
