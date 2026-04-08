'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase, isDummyMode } from '@/lib/supabase';

/**
 * 로그인 게이트 훅.
 * - user: 현재 인증된 사용자 (없으면 null)
 * - loading: 초기 세션 확인 중
 * - requireAuth(): 비로그인 시 true 반환 → 호출자가 showModal(true) 처리
 */
export default function useRequireAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // 세션 사용자 → profiles.role 조회. admin/superadmin이면 어떤 보호 페이지든 통과.
  const fetchRole = useCallback(async (sessionUser) => {
    if (!sessionUser || !supabase) {
      setRole(null);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionUser.id)
        .maybeSingle();
      setRole(data?.role || null);
    } catch {
      setRole(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (isDummyMode || !supabase) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const u = data?.session?.user || null;
      setUser(u);
      await fetchRole(u);
      setLoading(false);
    }
    load();

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user || null;
        setUser(u);
        fetchRole(u);
      });
      return () => {
        mounted = false;
        sub?.subscription?.unsubscribe?.();
      };
    }
    return () => {
      mounted = false;
    };
  }, [fetchRole]);

  const isAdmin = role === 'admin' || role === 'superadmin';

  const requireAuth = useCallback(() => {
    // 일반 로그인 사용자 또는 관리자(admin/superadmin) 모두 통과
    if (user) return true;
    setShowModal(true);
    return false;
  }, [user]);

  return {
    user,
    role,
    isAdmin,
    loading,
    isAuthenticated: !!user,
    showModal,
    setShowModal,
    requireAuth,
  };
}
