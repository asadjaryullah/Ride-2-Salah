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
  },
};

export default config;
