import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from './api';
import { supabase } from './lib/supabase';

type Theme = 'light' | 'dark';

export const PALETTES = [
  { id: 'teal', label: 'Teal', color: '#087f70' },
  { id: 'indigo', label: 'Indigo', color: '#4f46e5' },
  { id: 'rose', label: 'Rose', color: '#be185d' },
  { id: 'amber', label: 'Sunset', color: '#b45309' },
  { id: 'slate', label: 'Graphite', color: '#334155' },
] as const;
export type Palette = (typeof PALETTES)[number]['id'];

interface Store {
  theme: Theme;
  toggleTheme: () => void;
  palette: Palette;
  setPalette: (p: Palette) => void;
  ready: boolean;
  session: Session | null;
  profile: api.Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  institute: string;
  updateInstitute: (name: string) => Promise<void>;
  registrations: api.Registration[];
  register: (activityId: string) => Promise<void>;
  cancel: (activityId: string) => Promise<void>;
  refreshRegistrations: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

const readTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('synchro.theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const readPalette = (): Palette => {
  try {
    const saved = localStorage.getItem('synchro.palette');
    if (PALETTES.some((p) => p.id === saved)) return saved as Palette;
  } catch {
    /* storage unavailable */
  }
  return 'teal';
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [palette, setPalette] = useState<Palette>(readPalette);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<api.Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [registrations, setRegistrations] = useState<api.Registration[]>([]);
  const [institute, setInstitute] = useState<string>(() => {
    try {
      return localStorage.getItem('synchro.institute') ?? '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    api
      .getInstituteName()
      .then((n) => {
        setInstitute(n);
        try {
          localStorage.setItem('synchro.institute', n);
        } catch {
          /* storage unavailable */
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('synchro.theme', theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  useEffect(() => {
    document.title = institute ? `Synchro · ${institute}` : 'Synchro';
  }, [institute]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    try {
      localStorage.setItem('synchro.palette', palette);
    } catch {
      /* storage unavailable */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETTES.find((p) => p.id === palette)?.color ?? '#087f70');
  }, [palette]);

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
      palette,
      setPalette,
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
      institute,
      updateInstitute: async (name) => {
        await api.setInstituteName(name);
        const n = await api.getInstituteName();
        setInstitute(n);
        try {
          localStorage.setItem('synchro.institute', n);
        } catch {
          /* storage unavailable */
        }
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
    [theme, palette, ready, session, profile, institute, registrations, userId, refreshRegistrations],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
