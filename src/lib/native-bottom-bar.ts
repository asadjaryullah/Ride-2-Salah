import { registerPlugin } from '@capacitor/core';

/* Eigenes natives Plugin fuer die Bottom-Bar (NativeBottomBarPlugin.swift)
   statt HTML/CSS: eine echte UIView mit UIBlur/SF-Symbols statt einer in
   der WKWebView gerenderten Leiste - gleiches Muster wie AppSettings in
   lib/app-settings.ts. Zunaechst nur iOS (siehe BottomNav.tsx); Android
   faellt bis zum ersten Android-Build weiter auf die Web-Variante zurueck. */
interface NativeBottomBarPlugin {
  setState(options: { visible: boolean; activeTab: string }): Promise<void>;
  setTheme(options: { theme: 'light' | 'dark' }): Promise<void>;
  addListener(
    eventName: 'tabTapped',
    listenerFunc: (data: { tab: string }) => void
  ): Promise<{ remove: () => void }>;
}

export const NativeBottomBar = registerPlugin<NativeBottomBarPlugin>('NativeBottomBar');
