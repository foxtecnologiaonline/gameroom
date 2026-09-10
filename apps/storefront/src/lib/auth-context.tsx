"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, endpoints, getToken, setToken } from "./api";
import type { AuthResponse, Usuario } from "./types";

const USER_KEY = "gr_usuario";

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<Usuario>;
  registrar: (nome: string, email: string, senha: string) => Promise<Usuario>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = getToken();
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(USER_KEY) : null;
    if (token && raw) {
      try {
        setUsuario(JSON.parse(raw));
      } catch {
        setUsuario(null);
      }
    }
    setCarregando(false);
  }, []);

  const persist = useCallback((res: AuthResponse) => {
    setToken(res.access_token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
    setUsuario(res.usuario);
    return res.usuario;
  }, []);

  const login = useCallback(
    async (email: string, senha: string) => {
      const res = await api.post<AuthResponse>(endpoints.login, { email, senha }, { auth: false });
      return persist(res);
    },
    [persist]
  );

  const registrar = useCallback(
    async (nome: string, email: string, senha: string) => {
      const res = await api.post<AuthResponse>(
        endpoints.register,
        { nome, email, senha, tipo: "cliente" },
        { auth: false }
      );
      return persist(res);
    },
    [persist]
  );

  const logout = useCallback(() => {
    setToken(null);
    window.localStorage.removeItem(USER_KEY);
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({ usuario, carregando, login, registrar, logout }),
    [usuario, carregando, login, registrar, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
