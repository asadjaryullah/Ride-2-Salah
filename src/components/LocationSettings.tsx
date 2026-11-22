'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, Check, XCircle, AlertTriangle } from "lucide-react";
import { Capacitor } from '@capacitor/core';

export default function LocationSettings() {
  const [permission, setPermission] = useState<PermissionState | 'unknown'>('unknown');

  useEffect(() => {
    // Prüfen, wie der aktuelle Status ist
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermission(result.state);
        // Lauschen, falls der User es in den Einstellungen ändert
        result.onchange = () => {
          setPermission(result.state);
        };
      });
    }
  }, []);

  const askForLocation = () => {
    // Wir versuchen einfach, die Position zu holen. 
    // Wenn "prompt" (Fragen) eingestellt ist, kommt das Popup.
    navigator.geolocation.getCurrentPosition(
      () => setPermission('granted'),
      () => setPermission('denied')
    );
  };

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 w-full">
        <Check size={18} />
        <span className="text-sm font-medium">Standortzugriff aktiv</span>
      </div>
    );
  }

  if (permission === 'denied') {
    /* In der nativen App gibt es keine Browser-Leiste mit Schloss-Symbol -
       die alte Anleitung war schlicht falsch und fuehrte in eine Sackgasse.
       Die Einstellung liegt dort stattdessen in den Telefon-Einstellungen. */
    const platform = Capacitor.getPlatform();
    const anleitung = platform === 'ios'
      ? 'Öffne die iPhone-Einstellungen → "Ride 2 Salah" → Standort → auf "Beim Verwenden der App" stellen.'
      : platform === 'android'
        ? 'Öffne die Android-Einstellungen → Apps → "Ride 2 Salah" → Berechtigungen → Standort erlauben.'
        : 'Tippe oben in der Browser-Leiste auf das Schloss-Symbol 🔒 oder \'Aa\' und setze Standort auf "Erlauben".';

    return (
      <div className="flex flex-col gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 w-full">
        <div className="flex items-center gap-2 font-bold text-sm">
          <XCircle size={18} />
          <span>Zugriff blockiert</span>
        </div>
        <p className="text-xs text-red-800">
          Du hast den Zugriff verweigert. Wir dürfen nicht nochmal fragen.
          <br/><strong>Lösung:</strong> {anleitung}
        </p>
      </div>
    );
  }

  // Status "prompt" (noch nie gefragt oder zurückgesetzt)
  return (
    <Button 
      variant="outline" 
      onClick={askForLocation}
      className="w-full justify-start gap-2 border-slate-300 text-slate-700"
    >
      <MapPin size={18} />
      Standort freigeben
    </Button>
  );
}