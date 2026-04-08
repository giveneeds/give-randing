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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
      setUser(data?.session?.user || null);
      setLoading(false);
    }
    load();

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });
      return () => {
        mounted = false;
        sub?.subscription?.unsubscribe?.();
      };
    }
    return () => {
      mounted = false;
    };
  }, []);

  const requireAuth = useCallback(() => {
    if (user) return true;
    setShowModal(true);
    return false;
  }, [user]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    showModal,
    setShowModal,
    requireAuth,
  };
}
