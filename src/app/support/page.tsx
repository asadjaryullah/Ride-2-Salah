'use client';

import { useTransitionRouter } from 'next-view-transitions';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import { openWhatsAppChat } from '@/lib/share';

const SUPPORT_WHATSAPP = "4915904273761";
const SUPPORT_EMAIL = "asad.jaryullah@ahmadiyya.de";

export default function SupportPage() {
  const router = useTransitionRouter();

  return (
    <main className="min-h-screen flex flex-col items-center p-6" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6" style={{ color: 'var(--app-text2)' }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur App
        </Button>

        <div className="rounded-2xl p-6" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--app-text)' }}>Support</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--app-text2)' }}>
            Fragen, Probleme oder Fehler in der App? Wir helfen gern.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => openWhatsAppChat(SUPPORT_WHATSAPP, "Salam, ich habe eine Frage zu Ride 2 Salah:")}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left active:scale-[0.98] transition-transform"
              style={{ background: 'var(--app-emerald-dim)', border: '1px solid var(--app-emerald)' }}
            >
              <div className="p-2 rounded-full" style={{ background: 'rgba(10,92,62,0.15)' }}>
                <MessageCircle size={20} style={{ color: 'var(--app-emerald)' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--app-emerald)' }}>WhatsApp</p>
                <p className="text-xs" style={{ color: 'var(--app-text2)' }}>+49 159 04273761</p>
              </div>
            </button>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left active:scale-[0.98] transition-transform"
              style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}
            >
              <div className="p-2 rounded-full" style={{ background: 'rgba(160,120,32,0.15)' }}>
                <Mail size={20} style={{ color: 'var(--app-gold)' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--app-gold)' }}>E-Mail</p>
                <p className="text-xs break-all" style={{ color: 'var(--app-text2)' }}>{SUPPORT_EMAIL}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
