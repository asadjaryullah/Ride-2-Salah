'use client';

import { useState, useEffect } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { supabase } from '@/lib/supabase';
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CompleteProfilePage() {
  const router = useTransitionRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Wir holen den aktuellen User
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };
    getUser();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 5) {
        toast.error("Bitte eine gültige Nummer eingeben.");
        return;
    }
    
    setLoading(true);

    // Wir updaten NUR die Telefonnummer im Profil
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone })
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      // Erfolgreich! Zurück zum Start
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--app-bg)' }}>
      <Card className="w-full max-w-sm" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', borderTop: '3px solid var(--app-gold)' }}>
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full w-fit mb-2" style={{ background: 'var(--app-gold-dim)' }}>
            <Phone className="h-6 w-6" style={{ color: 'var(--app-gold)' }} />
          </div>
          <CardTitle style={{ color: 'var(--app-text)' }}>Handynummer fehlt</CardTitle>
          <CardDescription style={{ color: 'var(--app-text2)' }}>
            Damit dich Fahrer oder Mitfahrer erreichen können, benötigen wir noch deine Nummer.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-semibold" style={{ color: 'var(--app-text2)' }}>Handynummer</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--app-text3)' }} />
                    <Input
                      className="pl-9 h-12 text-lg"
                      placeholder="0176 12345678"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                </div>
            </div>

            <button type="submit" className="btn-gold w-full h-12 text-lg" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 className="animate-spin mr-2 inline" /> : "Speichern & Weiter"}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}