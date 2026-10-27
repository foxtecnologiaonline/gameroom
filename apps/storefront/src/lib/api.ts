import type { ApiErrorBody } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const TOKEN_KEY = "gr_access_token";
const REFRESH_KEY = "gr_refresh_token";

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

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(REFRESH_KEY, token);
  else window.localStorage.removeItem(REFRESH_KEY);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  /** Sent as the Idempotency-Key header — required by endpoints that move money or stock. */
  idempotencyKey?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, idempotencyKey } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      {
        statusCode: 0,
        message: "Não foi possível conectar à API. Verifique se o backend está em execução.",
      },
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
  del: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

/** Paths centralizados — batem com os controllers reais em apps/api/src/*. */
export const endpoints = {
  login: "/auth/login",
  register: "/auth/register",
  refresh: "/auth/refresh",
  me: "/me",

  products: "/products",
  product: (id: string) => `/products/${id}`,
  productOffers: (id: string) => `/products/${id}/offers`,
  productsAdmin: "/products/admin",
  productModeration: (id: string) => `/products/${id}/moderation`,

  categories: "/categories",

  cart: "/cart",
  cartItems: "/cart/items",
  cartItem: (id: string) => `/cart/items/${id}`,

  checkout: "/checkout",
  order: (id: string) => `/orders/${id}`,

  paymentsCharge: "/payments/charge",
  paymentsWebhook: "/payments/webhook",

  sellers: "/sellers",
  sellerMine: "/sellers/me",
  sellerPublic: (id: string) => `/sellers/${id}/public`,
  sellerReviews: (id: string) => `/sellers/${id}/reviews`,
  sellerOrders: (id: string) => `/sellers/${id}/orders`,
  sellerStatus: (id: string) => `/sellers/${id}/status`,

  shippingLabel: "/shipping/label",
  subOrderStatus: (id: string) => `/suborders/${id}/status`,
};
