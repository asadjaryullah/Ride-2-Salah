'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import { WidgetSync } from '@/lib/widget-sync';

type AuthContextType = {
  user: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

/* Spiegelt die aktuelle Supabase-Sitzung in die geteilte Keychain, damit
   die Widget-Extension (eigener Prozess, kein eigener Login) "Fahrt
   anbieten" direkt ausfuehren kann. Laeuft bei jeder Session-Aenderung mit,
   also auch bei den automatischen Token-Erneuerungen des Supabase-SDK -
   das Widget bekommt dadurch immer einen aktuellen Stand, ohne selbst
   staendig nachfragen zu muessen. */
function syncSessionToWidget(session: { access_token: string; refresh_token: string; expires_at?: number; user: { id: string } } | null) {
  if (Capacitor.getPlatform() !== 'ios') return;
  if (!session) {
    WidgetSync.clearSession().catch(() => {});
    return;
  }
  WidgetSync.setSession({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? (Date.now() / 1000 + 3600),
    userId: session.user.id,
  }).catch(() => {});
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial Session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      syncSessionToWidget(data.session as any);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listener
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        syncSessionToWidget(session as any);
      });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);