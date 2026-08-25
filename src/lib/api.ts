import type { ApiErrorBody } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const TOKEN_KEY = "gr_token";

export class ApiError extends Error {
  statusCode: number;
  constructor(body: ApiErrorBody, fallbackStatus: number) {
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message || "Erro inesperado";
    super(message);
    this.statusCode = body?.statusCode ?? fallbackStatus;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  isFormData?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, isFormData = false } = options;

  const headers: Record<string, string> = {};
  if (!isFormData) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      { statusCode: 0, message: "Não foi possível conectar à API. Verifique se o backend está em execução." },
      0
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    throw new ApiError((json as ApiErrorBody) || { statusCode: res.status, message: res.statusText }, res.status);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  del: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
  upload: <T>(path: string, formData: FormData, opts?: Omit<RequestOptions, "method" | "body" | "isFormData">) =>
    request<T>(path, { ...opts, method: "POST", body: formData, isFormData: true }),
};

/**
 * Paths centralizados para facilitar ajuste caso o contrato real do backend
 * (fora deste repositório na etapa atual) divirja das suposições abaixo.
 */
export const endpoints = {
  login: "/auth/login",
  register: "/auth/register",

  produtos: "/produtos",
  produtoDetalhe: (id: string) => `/produtos/${id}`,
  produtosAdmin: "/produtos?admin=true",
  produtoConteudos: (id: string) => `/produtos/${id}/conteudos`,

  checkout: "/checkout",
  venda: (vendaId: string) => `/vendas/${vendaId}`,
  simularWebhookPagamento: "/checkout/webhook/simular",

  minhasCompras: "/minhas-compras",
  minhaCompraDetalhe: (vendaId: string) => `/minhas-compras/${vendaId}`,

  devolucoes: "/devolucoes",
  devolucaoDetalhe: (id: string) => `/devolucoes/${id}`,

  adminVendas: "/admin/vendas",
  adminEstoque: (produtoId: string) => `/admin/estoque/${produtoId}`,
  adminReabastecimentos: "/admin/reabastecimentos",
  adminDevolucoesRevisaoManual: "/admin/devolucoes/revisao-manual",
  adminDevolucaoAprovar: (id: string) => `/admin/devolucoes/${id}/aprovar`,
  adminDevolucaoRejeitar: (id: string) => `/admin/devolucoes/${id}/rejeitar`,
};
