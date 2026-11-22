import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/* Reine Browser-Nutzung (Web/PWA) hat kein Vibrations-API-Äquivalent, das
   sich gut anfühlt - deshalb bewusst nur in der nativen App aktiv, im
   Browser ein no-op statt eines schwachen Ersatzes. */
function isNative() {
  return Capacitor.isNativePlatform();
}

export async function hapticTap() {
  if (!isNative()) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
}

export async function hapticSuccess() {
  if (!isNative()) return;
  try { await Haptics.notification({ type: NotificationType.Success }); } catch {}
}

export async function hapticWarning() {
  if (!isNative()) return;
  try { await Haptics.notification({ type: NotificationType.Warning }); } catch {}
}
