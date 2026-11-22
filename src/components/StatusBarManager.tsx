'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/* Ohne dieses Plugin ueberlaesst man die Status-Bar-Farbe (Uhrzeit, Akku,
   Empfang oben) dem System-Standard - auf dunklem Grund wuerden dunkle
   Status-Bar-Icons kaum lesbar. Die App hat zwei Themes (hell/dunkel,
   per Systemeinstellung oder manuell per data-theme umgeschaltet, siehe
   layout.tsx), die Status-Bar muss dem jeweils folgen. */
function getEffectiveTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

async function applyStatusBar(theme: 'light' | 'dark') {
  // Capacitors Benennung ist nicht "Style fuer X-Hintergrund", sondern die
  // Farbe der Status-Bar-Schrift selbst: Style.Dark = helle Schrift (fuer
  // dunkle App-Hintergruende), Style.Light = dunkle Schrift (fuer helle
  // App-Hintergruende) - wirkt beim ersten Lesen vertauscht, ist es aber
  // laut offizieller Typdefinition nicht.
  await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
  // Nur fuer Android relevant (iOS zeigt immer den Seiteninhalt durch).
  await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#07070e' : '#f5f0e8' }).catch(() => {});
}

export default function StatusBarManager() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    applyStatusBar(getEffectiveTheme());

    // Manueller Theme-Wechsel in der App (data-theme am <html>-Element)
    const observer = new MutationObserver(() => applyStatusBar(getEffectiveTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Systemweiter Hell-/Dunkelmodus-Wechsel, falls kein manueller Theme
    // gesetzt ist (data-theme fehlt dann, CSS folgt der Systemeinstellung)
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = () => applyStatusBar(getEffectiveTheme());
    media.addEventListener('change', onMediaChange);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', onMediaChange);
    };
  }, []);

  return null;
}
