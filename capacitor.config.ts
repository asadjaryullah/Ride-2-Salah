import type { CapacitorConfig } from '@capacitor/cli';

/*
 * Die App bleibt serverseitig gerendert (Supabase Service-Role-Key, Cron,
 * Push-Versand laufen als echte Next.js-API-Routen) - ein statischer Export
 * waere damit nicht moeglich. Die native Huelle laedt deshalb direkt die
 * produktive Vercel-URL, statt gebaute Dateien lokal mitzuliefern.
 */
const config: CapacitorConfig = {
  appId: 'app.ride2salah.mobile',
  appName: 'Ride 2 Salah',
  webDir: 'public',
  server: {
    url: 'https://ride2salah.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    /* "native": das Betriebssystem passt die sichtbare Flaeche selbst an,
       statt dass die Seite sich per JS/CSS neu berechnet - verhaelt sich
       robuster mit fixed-position-Elementen (BottomNav, Bottom-Sheets) als
       die Alternativen. */
    Keyboard: {
      resize: 'native',
    },
    /* StatusBar wird nicht hier, sondern in StatusBarManager.tsx gesetzt -
       die Farbe haengt vom Hell-/Dunkelmodus ab, der sich zur Build-Zeit
       noch nicht kennt. */
  },
};

export default config;
