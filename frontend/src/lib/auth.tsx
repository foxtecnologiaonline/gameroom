'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from './api';

export interface JwtPayload {
  sub: string;
  email: string;
  tipo: 'admin' | 'cliente';
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const CHAVE_ACCESS = 'gameroom_access_token';
const CHAVE_REFRESH = 'gameroom_refresh_token';

function decodificarToken(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    const normalizado = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalizado));
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: JwtPayload | null;
  accessToken: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<JwtPayload | null>;
  registrar: (nome: string, email: string, senha: string) => Promise<JwtPayload | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(CHAVE_ACCESS);
    if (token) {
      const payload = decodificarToken(token);
      if (payload) {
        setAccessToken(token);
        setUser(payload);
      }
    }
    setCarregando(false);
  }, []);

  const salvarTokens = useCallback((tokens: Tokens) => {
    localStorage.setItem(CHAVE_ACCESS, tokens.accessToken);
    localStorage.setItem(CHAVE_REFRESH, tokens.refreshToken);
    const payload = decodificarToken(tokens.accessToken);
    setAccessToken(tokens.accessToken);
    setUser(payload);
    return payload;
  }, []);

  const login = useCallback(
    async (email: string, senha: string) => {
      const tokens = await api.post<Tokens>('/auth/login', { email, senha });
      return salvarTokens(tokens);
    },
    [salvarTokens],
  );

  const registrar = useCallback(
    async (nome: string, email: string, senha: string) => {
      const tokens = await api.post<Tokens>('/auth/registrar', { nome, email, senha });
      return salvarTokens(tokens);
    },
    [salvarTokens],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(CHAVE_ACCESS);
    localStorage.removeItem(CHAVE_REFRESH);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, carregando, login, registrar, logout }),
    [user, accessToken, carregando, login, registrar, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message;
  if (erro instanceof Error) return erro.message;
  return 'Erro inesperado';
}
