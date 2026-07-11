import type { ApiEnvelope, MonitorizacaoConflito } from '../types/api';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const baseUrl = rawBaseUrl.replace(/\/+$/, '');

export class ApiError extends Error {
  status?: number;
  conflitos?: MonitorizacaoConflito[];

  constructor(message: string, status?: number, conflitos?: MonitorizacaoConflito[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.conflitos = conflitos;
  }
}

type ApiResponseBody<T> = ApiEnvelope<T> & { conflitos?: MonitorizacaoConflito[] };

async function parseResponse<T>(response: Response): Promise<T> {
  let body: ApiResponseBody<T> | null = null;
  try {
    body = (await response.json()) as ApiResponseBody<T>;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(body?.mensagem || `Erro HTTP ${response.status}`, response.status, body?.conflitos);
  }
  if (!body) throw new ApiError('Resposta invalida da API', response.status);
  if (!body.ok) throw new ApiError(body.mensagem || 'Erro retornado pela API', response.status, body.conflitos);
  return body.dados;
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  return parseResponse<T>(response);
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

  return parseResponse<T>(response);
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

  return parseResponse<T>(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  return parseResponse<T>(response);
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });
  return parseResponse<T>(response);
}
