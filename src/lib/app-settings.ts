import { registerPlugin } from '@capacitor/core';

/* Eigenes, kleines natives Plugin (iOS: AppSettingsPlugin.swift, Android:
   AppSettingsPlugin.java) statt eines fertigen npm-Pakets: gaengige
   Community-Pakete dafuer setzen auf CocoaPods, unser iOS-Projekt nutzt
   aber bewusst nur Swift Package Manager (kein Podfile) - mit eigenem
   Plugin bleibt es dabei. */
interface AppSettingsPlugin {
  open(): Promise<void>;
}

export const AppSettings = registerPlugin<AppSettingsPlugin>('AppSettings');
