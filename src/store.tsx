import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from './api';
import { supabase } from './lib/supabase';

type Theme = 'light' | 'dark';

interface Store {
  theme: Theme;
  toggleTheme: () => void;
  ready: boolean;
  session: Session | null;
  profile: api.Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  registrations: api.Registration[];
  register: (activityId: string) => Promise<void>;
  cancel: (activityId: string) => Promise<void>;
  refreshRegistrations: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

const readTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('campusly.theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<api.Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [registrations, setRegistrations] = useState<api.Registration[]>([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('campusly.theme', theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setRegistrations([]);
      return;
    }
    let live = true;
    Promise.all([api.getProfile(userId), api.listMyRegistrations()])
      .then(([p, r]) => {
        if (!live) return;
        setProfile(p);
        setRegistrations(r);
      })
      .catch(() => undefined)
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [userId]);

  const refreshRegistrations = useCallback(async () => {
    setRegistrations(await api.listMyRegistrations());
  }, []);

  const value = useMemo<Store>(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
      ready,
      session,
      profile,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      },
      signUp: async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw new Error(error.message);
        return { needsConfirmation: !data.session };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      registrations,
      register: async (activityId) => {
        if (!userId) throw new Error('Sign in to register.');
        await api.register(activityId, userId);
        await refreshRegistrations();
      },
      cancel: async (activityId) => {
        const r = registrations.find((x) => x.activity_id === activityId);
        if (r) await api.cancelRegistration(r.id);
        await refreshRegistrations();
      },
      refreshRegistrations,
    }),
    [theme, ready, session, profile, registrations, userId, refreshRegistrations],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
