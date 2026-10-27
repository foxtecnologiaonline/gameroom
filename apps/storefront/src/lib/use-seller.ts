"use client";

import { useCallback, useEffect, useState } from "react";
import { api, endpoints } from "./api";
import { useAuth } from "./auth-context";
import type { Seller } from "./types";

/**
 * Resolves the logged-in user's own seller record via GET /sellers/me.
 * `seller` stays null both while loading and when the user never applied
 * (a 404, or any other error) — `loading` tells those two apart.
 */
export function useSeller() {
  const { user, loading: authLoading } = useAuth();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSeller(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    api
      .get<Seller>(endpoints.sellerMine)
      .then((s) => active && setSeller(s))
      .catch(() => active && setSeller(null))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [user, authLoading, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { seller, loading, refetch };
}
