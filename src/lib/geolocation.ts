import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/* In Capacitors nativer WebView funktioniert die rohe Web-Geolocation-API
   nicht zuverlaessig (gleiche Grundursache wie bei den Push-
   Benachrichtigungen: WKWebView bindet das nicht automatisch an die
   native Standort-Berechtigung an) - Anfragen blieben dadurch fuer immer
   haengen, statt Erfolg oder Fehler zu melden. Drop-in-Ersatz mit exakt
   derselben Callback-Form wie navigator.geolocation.getCurrentPosition,
   damit die Aufrufstellen selbst unveraendert bleiben koennen. */
export function getCurrentPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError?: (error: GeolocationPositionError) => void
) {
  if (Capacitor.isNativePlatform()) {
    Geolocation.getCurrentPosition()
      .then((pos) => onSuccess(pos as unknown as GeolocationPosition))
      .catch((err) => {
        onError?.({
          code: 1,
          message: err?.message || 'Standort nicht verfügbar',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      });
    return;
  }
  navigator.geolocation.getCurrentPosition(onSuccess, onError);
}

/* Fuer die Live-Standortverfolgung waehrend einer Fahrt (driver/dashboard).
   Capacitors watchPosition() liefert die Watcher-ID per Promise statt
   synchron wie im Browser - die Aufrufstelle muss die ID deshalb in einem
   Ref zwischenspeichern, um sie beim Aufraeumen wieder sauber loeschen zu
   koennen (siehe dortigen Kommentar). */
export async function watchPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError?: (error: GeolocationPositionError) => void,
  options?: PositionOptions
): Promise<string | number> {
  if (Capacitor.isNativePlatform()) {
    return Geolocation.watchPosition(options ?? {}, (position, err) => {
      if (err) {
        onError?.({
          code: 1,
          message: err.message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
        return;
      }
      if (position) onSuccess(position as unknown as GeolocationPosition);
    });
  }
  return navigator.geolocation.watchPosition(onSuccess, onError, options);
}

export function clearWatch(id: string | number) {
  if (Capacitor.isNativePlatform()) {
    Geolocation.clearWatch({ id: id as string }).catch(() => {});
    return;
  }
  navigator.geolocation.clearWatch(id as number);
}

export async function checkLocationPermission(): Promise<PermissionState> {
  if (Capacitor.isNativePlatform()) {
    const result = await Geolocation.checkPermissions();
    // Capacitor kennt zusaetzlich 'prompt-with-rationale' - das DOM-typisierte
    // PermissionState der Aufrufstellen kennt nur 3 Werte, also hier angleichen.
    return result.location === 'prompt-with-rationale' ? 'prompt' : result.location;
  }
  if (navigator.permissions?.query) {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  }
  return 'prompt';
}
