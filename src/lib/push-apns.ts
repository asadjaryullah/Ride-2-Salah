import http2 from "node:http2";
import jwt from "jsonwebtoken";
import type { PushPayload } from "@/lib/webpush";

/* Direkter APNs-Versand statt Firebase/FCM fuer iOS: Capacitors
   Push-Notifications-Plugin liefert auf iOS ohnehin nur den rohen
   Apple-Device-Token (keine FCM-Einbindung ohne zusaetzliches natives
   Firebase-SDK im Xcode-Projekt) - also direkt an Apple senden, statt
   fuer nichts weiter als diese eine Umwandlung die komplette Firebase-
   iOS-Bibliothek ins Projekt zu holen.

   APNS_KEY enthaelt den Inhalt der .p8-Datei aus dem Apple Developer
   Account (Auth Key), einzeilig mit \n statt echten Zeilenumbruechen -
   gleiches Prinzip wie FIREBASE_SERVICE_ACCOUNT bei den Vercel-Env-Vars. */
let cachedToken: { token: string; issuedAt: number } | null = null;

function getProviderToken(): string | null {
  const key = process.env.APNS_KEY?.replace(/\\n/g, "\n");
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  if (!key || !keyId || !teamId) return null;

  // Apple empfiehlt, denselben Token bis zu 1h wiederzuverwenden statt
  // fuer jede Push-Anfrage neu zu signieren.
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now - cachedToken.issuedAt < 50 * 60) return cachedToken.token;

  const token = jwt.sign({ iss: teamId, iat: now }, key, {
    algorithm: "ES256",
    keyid: keyId,
  });
  cachedToken = { token, issuedAt: now };
  return token;
}

export function hasApnsConfigured(): boolean {
  return !!(process.env.APNS_KEY && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID);
}

/* Produktions-Host, nicht Sandbox: TestFlight- und App-Store-Builds laufen
   beide ueber die Produktions-APNs - Sandbox ist nur fuer direkt aus Xcode
   auf ein Geraet installierte Debug-Builds relevant. */
const APNS_HOST = "api.push.apple.com";

export async function sendApnsPush(
  tokens: string[],
  payload: PushPayload,
  logs: string[] = []
): Promise<{ successCount: number; invalidTokens: string[] }> {
  const providerToken = getProviderToken();
  const bundleId = process.env.APNS_BUNDLE_ID || "app.ride2salah.mobile";
  if (!providerToken || !tokens.length) return { successCount: 0, invalidTokens: [] };

  const client = http2.connect(`https://${APNS_HOST}`);
  client.on("error", (err) => logs.push(`⚠️ APNs-Verbindung fehlgeschlagen: ${err.message}`));

  let successCount = 0;
  const invalidTokens: string[] = [];

  const body = JSON.stringify({
    aps: { alert: { title: payload.title, body: payload.body }, sound: "default" },
    url: payload.url,
  });

  await Promise.all(
    tokens.map(
      (token) =>
        new Promise<void>((resolve) => {
          const req = client.request({
            ":method": "POST",
            ":path": `/3/device/${token}`,
            authorization: `bearer ${providerToken}`,
            "apns-topic": bundleId,
            "apns-push-type": "alert",
            "apns-priority": "10",
          });

          let status = 0;
          let responseBody = "";
          req.on("response", (headers) => {
            status = Number(headers[":status"]);
          });
          req.on("data", (chunk) => (responseBody += chunk));
          req.on("end", () => {
            if (status === 200) {
              successCount++;
            } else {
              const reason = (() => {
                try {
                  return JSON.parse(responseBody).reason;
                } catch {
                  return undefined;
                }
              })();
              if (status === 410 || reason === "BadDeviceToken" || reason === "Unregistered" || reason === "DeviceTokenNotForTopic") {
                invalidTokens.push(token);
              } else {
                logs.push(`⚠️ APNs-Push fehlgeschlagen (${status} ${reason ?? ""}): ${token.slice(-8)}`);
              }
            }
            resolve();
          });
          req.on("error", (err) => {
            logs.push(`⚠️ APNs-Request-Fehler: ${err.message}`);
            resolve();
          });
          req.write(body);
          req.end();
        })
    )
  );

  client.close();
  return { successCount, invalidTokens };
}
