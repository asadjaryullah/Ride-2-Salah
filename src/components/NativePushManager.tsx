'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

async function registerAndSaveNative(token: string) {
  const platform = Capacitor.getPlatform(); // 'ios' | 'android'
  if (platform !== 'ios' && platform !== 'android') return;

  const perm = await PushNotifications.checkPermissions();
  let granted = perm.receive === 'granted';
  if (!granted) {
    const requested = await PushNotifications.requestPermissions();
    granted = requested.receive === 'granted';
  }
  if (!granted) return;

  await PushNotifications.register();

  // registerAndSaveNative läuft, sobald eine Session vorliegt - das
  // eigentliche Token kommt asynchron über den 'registration'-Listener
  // weiter unten, nicht direkt aus register(). Hier nur Berechtigung +
  // Registrierung anstoßen; die Token-Zustellung übernimmt der Listener.
  void token;
}

/**
 * Pendant zu PushManager.tsx, nur für die native App (Capacitor): statt
 * Web Push (VAPID) über den Service Worker läuft die Zustellung hier über
 * Firebase Cloud Messaging. In einem normalen Browser ist
 * Capacitor.isNativePlatform() false und die Komponente tut nichts - die
 * Datei kann also gefahrlos auch auf der Web-Version mitgerendert werden.
 */
export default function NativePushManager() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let currentAccessToken: string | undefined;

    const registrationListener = PushNotifications.addListener('registration', async (fcmToken) => {
      if (!currentAccessToken) return;
      try {
        await fetch('/api/push-subscribe-native', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentAccessToken}` },
          body: JSON.stringify({ token: fcmToken.value, platform: Capacitor.getPlatform() }),
        });
      } catch (err) {
        console.error('❌ push-subscribe-native Fehler:', err);
      }
    });

    const errorListener = PushNotifications.addListener('registrationError', (err) => {
      console.error('❌ FCM-Registrierung fehlgeschlagen:', err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      currentAccessToken = session?.access_token;
      if (currentAccessToken) registerAndSaveNative(currentAccessToken).catch(console.error);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      currentAccessToken = session?.access_token;
      if (currentAccessToken) registerAndSaveNative(currentAccessToken).catch(console.error);
    });

    return () => {
      subscription.unsubscribe();
      registrationListener.then((handle) => handle.remove());
      errorListener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
