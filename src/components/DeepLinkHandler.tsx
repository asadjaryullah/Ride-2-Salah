'use client';

import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Faengt den Ruecksprung aus dem Google-Login ab (ueber das eigene
 * app.ride2salah.mobile://-URL-Schema, siehe login/page.tsx) und schliesst
 * die Anmeldung ab. Ohne das bliebe man nach Google im In-App-Browser
 * haengen, weil die App selbst nie erfaehrt, dass die Anmeldung fertig ist.
 *
 * Nur fuer den Google-Login relevant - der E-Mail-Code-Login verlässt die
 * App nie und braucht das nicht.
 */
export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!CapacitorApp || typeof window === 'undefined') return;

    const listenerPromise = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      await Browser.close().catch(() => {});

      if (!url.includes('auth/callback')) return;

      try {
        const codeMatch = url.match(/[?&]code=([^&]+)/);
        const code = codeMatch ? decodeURIComponent(codeMatch[1]) : null;
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        router.push('/');
      } catch (err) {
        console.error('❌ Deep-Link-Login fehlgeschlagen:', err);
        router.push('/login');
      }
    });

    return () => {
      listenerPromise.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
