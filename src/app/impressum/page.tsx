'use client';

import { useTransitionRouter } from 'next-view-transitions';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ImpressumPage() {
  const router = useTransitionRouter();

  return (
    <main className="min-h-screen p-6 flex flex-col items-center" style={{ background: 'var(--app-bg)' }}>

      <div className="w-full max-w-2xl">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6" style={{ color: 'var(--app-text2)' }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
        </Button>

        <div className="p-8 rounded-2xl prose" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
          <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--app-text)' }}>Impressum</h1>

          <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--app-text)' }}>Angaben gemäß § 5 TMG</h2>
          <p className="mb-4" style={{ color: 'var(--app-text2)' }}>
            <strong>Ride 2 Salah</strong><br />
            Ein Projekt der Bashier Moschee Community<br />
            Ahmadiyya Muslim Gemeinde Bensheim<br />
            Zeppelinstraße 33<br />
            64625 Bensheim
          </p>

          <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--app-text)' }}>Kontakt</h2>
          <p className="mb-4" style={{ color: 'var(--app-text2)' }}>
            E-Mail: asad.jaryullah@ahmadiyya.de<br />
            Telefon: 015904273761
          </p>

          <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--app-text)' }}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p className="mb-4" style={{ color: 'var(--app-text2)' }}>
            Asad Jaryullah<br />
            Zeppelinstraße 33, 64625 Bensheim
          </p>

          <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--app-text)' }}>Haftungsausschluss</h2>
          <p className="text-sm" style={{ color: 'var(--app-text2)' }}>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
            Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            Die Nutzung der App "Ride 2 Salah" erfolgt auf eigene Verantwortung.
          </p>
        </div>
      </div>
    </main>
  );
}