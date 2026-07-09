import type { ApiEnvelope } from '../types/api';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const baseUrl = rawBaseUrl.replace(/\/+$/, '');

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(body?.mensagem || `Erro HTTP ${response.status}`, response.status);
  }

  if (!body) {
    throw new ApiError('Resposta invalida da API', response.status);
  }

  if (!body.ok) {
    throw new ApiError(body.mensagem || 'Erro retornado pela API', response.status);
  }

  return body.dados;
}

export async function apiPost<T, B = unknown>(path: string, payload: B): Promise<T> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(body?.mensagem || `Erro HTTP ${response.status}`, response.status);
  }

  if (!body) {
    throw new ApiError('Resposta invalida da API', response.status);
  }

  if (!body.ok) {
    throw new ApiError(body.mensagem || 'Erro retornado pela API', response.status);
  }

  return body.dados;
}

export async function apiPut<T, B = unknown>(path: string, payload: B): Promise<T> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(body?.mensagem || `Erro HTTP ${response.status}`, response.status);
  }

  if (!body) {
    throw new ApiError('Resposta invalida da API', response.status);
  }

  if (!body.ok) {
    throw new ApiError(body.mensagem || 'Erro retornado pela API', response.status);
  }

  return body.dados;
}
