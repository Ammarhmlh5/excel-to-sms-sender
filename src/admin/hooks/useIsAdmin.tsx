import { useEffect, useState } from 'react';
import { supabase } from '@/shared/integrations/supabase/client';
import { useAuth } from '@/shared/hooks/useAuth';

const CACHE_KEY = 'hudhud_admin_cache';

interface AdminCache {
  value: boolean;
  expiresAt: number;
}

export const clearAdminCache = () => {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // sessionStorage not available
  }
};

const getCachedAdmin = (_userId: string): boolean | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: AdminCache = JSON.parse(raw);
    if (cache.value && cache.expiresAt > Date.now()) {
      return true;
    }
    if (!cache.value && cache.expiresAt > Date.now()) {
      return false;
    }
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
};

const setCachedAdmin = (_userId: string, value: boolean) => {
  try {
    const cache: AdminCache = {
      value,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // sessionStorage not available
  }
};

export const useIsAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      clearAdminCache();
      return;
    }

    const cached = getCachedAdmin(user.id);
    if (cached !== null) {
      setIsAdmin(cached);
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!active) return;
      const result = !error && !!data;
      setCachedAdmin(user.id, result);
      setIsAdmin(result);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading, clearAdminCache };
};
