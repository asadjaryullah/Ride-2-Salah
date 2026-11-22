'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, Check, XCircle, AlertTriangle } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { AppSettings } from '@/lib/app-settings';
import { checkLocationPermission, getCurrentPosition } from '@/lib/geolocation';

export default function LocationSettings() {
  const [permission, setPermission] = useState<PermissionState | 'unknown'>('unknown');

  useEffect(() => {
    // navigator.permissions.query('geolocation') ist in der nativen
    // WebView nicht zuverlaessig - checkLocationPermission() fragt dort
    // stattdessen ueber das Capacitor-Plugin, das den echten Status kennt.
    checkLocationPermission().then(setPermission);

    if (!Capacitor.isNativePlatform() && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        result.onchange = () => setPermission(result.state);
      });
    }
  }, []);

  const askForLocation = () => {
    // Wir versuchen einfach, die Position zu holen.
    // Wenn "prompt" (Fragen) eingestellt ist, kommt das Popup.
    getCurrentPosition(
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
       Die Einstellung liegt dort stattdessen in den Telefon-Einstellungen -
       und dorthin springt der Knopf jetzt direkt (eigenes natives Plugin,
       siehe lib/app-settings.ts), statt nur eine Textanleitung zu zeigen. */
    const isNative = Capacitor.isNativePlatform();
    const anleitung = isNative
      ? 'Einmal abgelehnt lässt sich die Berechtigung nur in den Einstellungen wieder erlauben, nicht nochmal über einen App-Dialog.'
      : 'Tippe oben in der Browser-Leiste auf das Schloss-Symbol 🔒 oder \'Aa\' und setze Standort auf "Erlauben".';

    return (
      <div className="flex flex-col gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 w-full">
        <div className="flex items-center gap-2 font-bold text-sm">
          <XCircle size={18} />
          <span>Zugriff blockiert</span>
        </div>
        <p className="text-xs text-red-800">
          Du hast den Zugriff verweigert. {anleitung}
        </p>
        {isNative && (
          <Button
            variant="outline"
            onClick={() => AppSettings.open()}
            className="w-full justify-start gap-2 border-red-300 text-red-700"
          >
            <MapPin size={18} />
            Einstellungen öffnen
          </Button>
        )}
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