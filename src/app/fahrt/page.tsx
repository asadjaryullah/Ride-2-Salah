'use client';

import { useEffect, useState } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { Card } from "@/components/ui/card";
import { Loader2, Car, Navigation, ChevronRight } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { todayBerlin } from '@/lib/date';

type Prayer = { id: string; name: string; time: string };
type Driver = { name: string; freeSeats: number };

function minutesUntil(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const nowBerlin = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
  const target = new Date(nowBerlin);
  target.setHours(h, m, 0, 0);
  return Math.round((target.getTime() - nowBerlin.getTime()) / 60000);
}

function formatCountdown(mins: number): string {
  if (mins < 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `noch ${h} Std ${m} Min`;
  return `noch ${m} Min`;
}

export default function FahrtPage() {
  const router = useTransitionRouter();

  const [loading, setLoading] = useState(true);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [selected, setSelected] = useState<Prayer | null>(null);
  const [nowHHMM, setNowHHMM] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    const update = () => setNowHHMM(new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('prayer_times').select('id,name,time').order('sort_order', { ascending: true });
      if (data?.length) {
        setPrayers(data);
        const nowHHMMInit = new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
        const next = data.find(p => p.time > nowHHMMInit) || data[0];
        setSelected(next);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Verfuegbare Fahrten fuers ausgewaehlte Gebet - gleiche Gender-Filterung
  // wie in passenger/list/page.tsx und TodayCard.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let gender = 'male';
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
        if (profile?.gender) gender = profile.gender;
      }

      const today = todayBerlin();
      const { data: ridesData } = await supabase
        .from('rides')
        .select('id,driver_name,seats')
        .eq('prayer_id', selected.id)
        .eq('status', 'active')
        .eq('ride_date', today)
        .eq('driver_gender', gender);

      if (!ridesData?.length) { if (!cancelled) setDrivers([]); return; }

      const rideIds = ridesData.map(r => r.id);
      const { data: bookings } = await supabase.from('bookings').select('ride_id').in('ride_id', rideIds).eq('status', 'accepted');

      const list = ridesData.map(r => {
        const taken = bookings?.filter(b => b.ride_id === r.id).length ?? 0;
        return { name: r.driver_name || 'Fahrer', freeSeats: Math.max(r.seats - taken, 0) };
      });
      if (!cancelled) setDrivers(list);
    };

    load();
    const interval = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [selected]);

  const nextIndex = prayers.findIndex(p => p.time > nowHHMM);
  const nextPrayerId = nextIndex === -1 ? prayers[0]?.id : prayers[nextIndex].id;
  const mins = selected ? minutesUntil(selected.time) : 0;
  const isNext = selected?.id === nextPrayerId;

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pb-nav-safe" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full max-w-md mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--app-text)' }}>Fahrt</h1>
      </div>

      {loading ? (
        <div className="py-20"><Loader2 className="animate-spin" style={{ color: 'var(--app-text3)' }} /></div>
      ) : (
        <div className="w-full max-w-md space-y-6">
          {/* AKTUELLES GEBET */}
          {selected && (
            <Card className="p-4 rounded-2xl" style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--app-gold)' }}>
                    {isNext ? 'Nächstes Gebet' : 'Ausgewählt'}
                  </p>
                  <p className="text-2xl font-extrabold" style={{ color: 'var(--app-text)' }}>{selected.name}</p>
                </div>
                {mins >= 0 && (
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--app-gold)' }}>{formatCountdown(mins)}</p>
                    <p className="text-xs" style={{ color: 'var(--app-text2)' }}>{selected.time} Uhr</p>
                  </div>
                )}
              </div>

              <div className="flex gap-1 pt-3" style={{ borderTop: '1px solid var(--app-border)' }}>
                {prayers.map((p) => {
                  const active = p.id === selected.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="flex-1 py-1.5 rounded-lg text-center active:scale-[0.95] transition-transform"
                      style={{
                        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                        background: active ? 'var(--app-gold)' : 'transparent',
                      }}
                    >
                      <span className="block text-[9px] font-bold uppercase" style={{ color: active ? '#fff' : 'var(--app-text3)' }}>{p.name}</span>
                      <span className="block text-[10px] font-bold" style={{ color: active ? '#fff' : 'var(--app-text2)' }}>{p.time}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ROLLEN-AUSWAHL */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/select-prayer?role=driver')}
              className="rounded-2xl p-5 text-left active:scale-[0.96] transition-transform"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(201,162,60,0.2)', border: '1px solid var(--app-gold)' }}>
                <Car size={20} style={{ color: 'var(--app-gold)' }} />
              </div>
              <p className="font-extrabold text-[15px]" style={{ color: 'var(--app-gold)' }}>Fahrer</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>Plätze anbieten</p>
            </button>

            <button
              onClick={() => router.push('/select-prayer?role=passenger')}
              className="rounded-2xl p-5 text-left active:scale-[0.96] transition-transform"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'var(--app-blue-dim)', border: '1px solid var(--app-blue)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(91,127,255,0.15)', border: '1px solid var(--app-blue)' }}>
                <Navigation size={20} style={{ color: 'var(--app-blue)' }} />
              </div>
              <p className="font-extrabold text-[15px]" style={{ color: 'var(--app-blue)' }}>Mitfahrer</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>Fahrt finden</p>
            </button>
          </div>

          {/* VERFUEGBARE FAHRTEN */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--app-text2)' }}>
              Fahrten zum {selected?.name ?? '...'}
            </h2>

            {drivers.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--app-text3)' }}>
                Noch niemand angemeldet — sei der Erste!
              </p>
            ) : (
              drivers.map((d, i) => (
                <Card
                  key={i}
                  onClick={() => selected && router.push(`/passenger/list?prayer=${selected.id}&time=${selected.time}`)}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}
                >
                  <div className="p-2 rounded-full" style={{ background: 'var(--app-gold-dim)' }}>
                    <Car size={16} style={{ color: 'var(--app-gold)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: 'var(--app-text)' }}>{d.name}</p>
                    <p className="text-xs" style={{ color: 'var(--app-text3)' }}>
                      {d.freeSeats > 0 ? `${d.freeSeats} ${d.freeSeats === 1 ? 'Platz' : 'Plätze'} frei` : 'Voll besetzt'}
                    </p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--app-text3)' }} />
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}
