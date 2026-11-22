'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

/* Blendet den nativen Splash erst aus, wenn die Seite wirklich geladen hat
   (launchAutoHide: false in capacitor.config.ts) - sonst verschwindet er
   nach einer festen kurzen Zeit, obwohl die App von der Vercel-URL ueber
   das Netz laedt und je nach Verbindung noch nicht fertig ist. Der
   Sicherheits-Timeout verhindert, dass der Splash fuer immer stehen
   bleibt, falls das 'load'-Ereignis aus irgendeinem Grund nie kommt -
   gleiches Prinzip wie der safetyTimer auf der Startseite. */
const SAFETY_TIMEOUT_MS = 4000;
const FADE_OUT_MS = 300;

export default function SplashScreenManager() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      SplashScreen.hide({ fadeOutDuration: FADE_OUT_MS }).catch(() => {});
    };

    if (document.readyState === 'complete') {
      hide();
    } else {
      window.addEventListener('load', hide, { once: true });
    }

    const safety = setTimeout(hide, SAFETY_TIMEOUT_MS);

    return () => {
      window.removeEventListener('load', hide);
      clearTimeout(safety);
    };
  }, []);

  return null;
}
