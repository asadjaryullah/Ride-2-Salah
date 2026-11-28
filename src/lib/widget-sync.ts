import { registerPlugin } from '@capacitor/core';

/* iOS: WidgetSyncPlugin.swift. Haelt die Widget-Extension (eigener,
   getrennter Prozess ohne eigenen Login) auf dem aktuellen Stand: Supabase-
   Sitzung fuer "Fahrt anbieten" direkt aus dem Widget, Zikr-Zahlen fuer die
   Anzeige dort. Android hat aktuell kein Widget, deshalb kein Gegenstueck
   noetig - Aufrufe werden nur auf iOS gemacht (siehe Aufrufer). */
interface WidgetSyncPlugin {
  setSession(options: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    userId: string;
  }): Promise<void>;
  clearSession(): Promise<void>;
  setZikrCounts(options: {
    zikr1: number;
    zikr2: number;
    zikr3: number;
    dateKey: string;
  }): Promise<void>;
}

export const WidgetSync = registerPlugin<WidgetSyncPlugin>('WidgetSync');
