const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  isFormData?: boolean;
}

async function extrairMensagemErro(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const mensagem = data?.message;
    if (Array.isArray(mensagem)) return mensagem.join(', ');
    if (typeof mensagem === 'string') return mensagem;
  } catch {
    // resposta sem corpo JSON
  }
  return res.statusText || 'Erro inesperado';
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, { method: options.method ?? 'GET', headers, body });

  if (!res.ok) {
    throw new ApiError(res.status, await extrairMensagemErro(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T,>(path: string, token?: string | null) => request<T>(path, { token }),
  post: <T,>(path: string, body?: unknown, token?: string | null) => request<T>(path, { method: 'POST', body, token }),
  patch: <T,>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'PATCH', body, token }),
  postForm: <T,>(path: string, form: FormData, token?: string | null) =>
    request<T>(path, { method: 'POST', body: form, isFormData: true, token }),
};
