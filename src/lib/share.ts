import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';

/* In der nativen App geht window.open() fuer externe Links ueber den
   System-Browser statt ueber eine Navigation, die iOS/Android zuverlaessig
   direkt an eine installierte App (WhatsApp) weiterreicht - bekannte
   Einschraenkung von Capacitors WKWebView. Zwei Faelle, zwei bessere Wege:

   1) Eine Nachricht an eine beliebige Gruppe/Person teilen (kein fester
      Empfaenger) -> natives Teilen-Menue, der Nutzer waehlt selbst
      WhatsApp (oder etwas anderes).
   2) Einen bestimmten Kontakt direkt per WhatsApp anschreiben (fester
      Empfaenger) -> Capacitors In-App-Browser statt window.open, der
      App-Weiterleitungen zuverlaessiger behandelt. */

export async function shareText(text: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ text });
      return;
    } catch {
      // Nutzer hat den Teilen-Dialog abgebrochen - kein Fehlerfall
      return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

export async function openWhatsAppChat(phone: string, text: string) {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url }).catch(() => {});
    return;
  }
  window.open(url, '_blank');
}
