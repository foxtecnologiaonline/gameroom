"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, endpoints, getToken, setRefreshToken, setToken } from "./api";
import type { AuthenticatedUser, TokenPair } from "./types";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthenticatedUser>;
  register: (email: string, password: string) => Promise<AuthenticatedUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<AuthenticatedUser>(endpoints.me)
      .then(setUser)
      .catch(() => {
        setToken(null);
        setRefreshToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (tokens: TokenPair) => {
    setToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    const me = await api.get<AuthenticatedUser>(endpoints.me);
    setUser(me);
    return me;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.post<TokenPair>(endpoints.login, { email, password }, { auth: false });
      return persist(tokens);
    },
    [persist]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.post<TokenPair>(endpoints.register, { email, password }, { auth: false });
      return persist(tokens);
    },
    [persist]
  );

  const logout = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
