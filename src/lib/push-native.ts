import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { PushPayload } from "@/lib/webpush";

let firebaseApp: App | null = null;

/* FIREBASE_SERVICE_ACCOUNT enthaelt das komplette Service-Account-JSON aus
   der Firebase-Konsole als ein String (Vercel-Env-Variablen sind einzeilig -
   deshalb hier als JSON.parse statt als separate Dateien). Fehlt die
   Variable (z.B. lokal ohne Firebase-Setup), bleibt die native Zustellung
   einfach aus - Web Push laeuft davon unberuehrt weiter. */
function getFirebaseApp(): App | null {
  if (firebaseApp) return firebaseApp;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) return null;

  const existing = getApps();
  if (existing.length) {
    firebaseApp = existing[0];
    return firebaseApp;
  }

  firebaseApp = initializeApp({
    credential: cert(JSON.parse(json)),
  });
  return firebaseApp;
}

export function hasFirebaseConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT;
}

/* Sendet per FCM an mehrere native Tokens (iOS + Android gleichermassen -
   FCM reicht iOS-Nachrichten intern an APNs weiter). Gibt die Liste der
   ungueltigen Tokens zurueck, damit der Aufrufer sie aus der Datenbank
   entfernen kann - gleiches Prinzip wie die 410/404-Bereinigung bei Web
   Push, nur mit FCMs eigenen Fehlercodes. */
export async function sendNativePush(
  tokens: string[],
  payload: PushPayload,
  logs: string[] = []
): Promise<{ successCount: number; invalidTokens: string[] }> {
  const app = getFirebaseApp();
  if (!app || !tokens.length) return { successCount: 0, invalidTokens: [] };

  const response = await getMessaging(app).sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.url ? { url: payload.url } : undefined,
  });

  const invalidTokens: string[] = [];
  response.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      invalidTokens.push(tokens[i]);
    } else {
      logs.push(`⚠️ FCM-Push fehlgeschlagen (${code}): ${r.error?.message}`);
    }
  });

  return { successCount: response.successCount, invalidTokens };
}
