'use client';

import { useState, useEffect } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  User, Phone, Save, Loader2, ArrowLeft, Calendar, BadgeInfo, Lock, MessageSquareWarning, List, LogOut,
  Settings, BarChart2, TrendingUp, Car, Footprints, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import LocationSettings from '@/components/LocationSettings';
import { openWhatsAppChat } from '@/lib/share';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const ADMIN_WHATSAPP = "+4915904273761";

export default function ProfilePage() {
  const router = useTransitionRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: 'male',
    memberId: ''
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [isGenderLocked, setIsGenderLocked] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setFormData({
            fullName: profile.full_name || '',
            phone: profile.phone || '',
            gender: profile.gender || 'male',
            memberId: profile.member_id || ''
          });
          if (profile.gender) setIsGenderLocked(true);
        }
      } catch (err) {
        console.error("Fehler beim Laden:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: formData.fullName,
        phone: formData.phone,
        gender: formData.gender,
        member_id: formData.memberId
      });
      if (error) throw error;
      toast.success("Profil gespeichert!");
      router.refresh();
      router.push('/');
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openCalendar = (apiUrl: string) => {
    const host = window.location.host;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const httpsUrl = `https://${host}${apiUrl}`;
    const url = isAndroid
      ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsUrl)}`
      : `webcal://${host}${apiUrl}`;
    if (isAndroid && Capacitor.isNativePlatform()) Browser.open({ url });
    else window.open(url, '_blank');
  };

  const initials = (formData.fullName || '?')
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <Loader2 className="animate-spin h-8 w-8" style={{ color: 'var(--app-text2)' }} />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pb-nav-safe" style={{ background: 'var(--app-bg)' }}>

      <div className="w-full max-w-sm flex items-center mb-4 mt-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}
          style={{ color: 'var(--app-text2)' }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
        </Button>
      </div>

      {/* PROFIL-HEADER */}
      <div className="w-full max-w-sm flex flex-col items-center mb-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black mb-3"
          style={{ background: 'var(--app-gold-dim)', color: 'var(--app-gold)', border: '2px solid var(--app-gold)' }}
        >
          {initials}
        </div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>{formData.fullName || 'Dein Profil'}</h2>
        {formData.memberId && (
          <p className="text-xs font-semibold" style={{ color: 'var(--app-text3)' }}>ID {formData.memberId}</p>
        )}
      </div>

      {/* REITER */}
      <div className="w-full max-w-sm flex gap-1 mb-4">
        {([
          { id: 'settings', Icon: Settings, label: 'Einstellungen' },
          { id: 'stats', Icon: BarChart2, label: 'Statistik' },
        ] as const).map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex-1 py-2.5 px-2 text-sm font-bold rounded-2xl transition flex flex-col items-center gap-1"
            style={activeTab === id
              ? { background: 'var(--app-text)', color: 'var(--app-bg)' }
              : { background: 'var(--app-surface2)', color: 'var(--app-text2)', border: '1px solid var(--app-border)' }
            }
          >
            <Icon size={17} />
            <span className="text-[10px] uppercase tracking-wide">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'settings' ? (
        <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>

          <div className="p-6 pb-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>Profil bearbeiten</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--app-text2)' }}>Hier kannst du deine Daten ändern.</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSave} className="space-y-4">

              {/* GESCHLECHT */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold uppercase ml-1" style={{ color: 'var(--app-text2)' }}>Geschlecht</label>
                  {isGenderLocked && (
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--app-text3)' }}>
                      <Lock size={10} /> Festgelegt
                    </span>
                  )}
                </div>
                <div className={`grid grid-cols-2 gap-2 ${isGenderLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <div
                    onClick={() => !isGenderLocked && setFormData({...formData, gender: 'male'})}
                    className="rounded-xl border-2 p-3 text-center transition flex flex-col items-center gap-1"
                    style={{
                      borderColor: formData.gender === 'male' ? 'var(--app-gold)' : 'var(--app-border)',
                      background: formData.gender === 'male' ? 'var(--app-gold-dim)' : 'var(--app-card)',
                      color: formData.gender === 'male' ? 'var(--app-gold)' : 'var(--app-text2)',
                      cursor: isGenderLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span className="text-xl">🧔🏻‍♂️</span>
                    <span className="text-sm font-bold">Bruder</span>
                  </div>
                  <div
                    onClick={() => !isGenderLocked && setFormData({...formData, gender: 'female'})}
                    className="rounded-xl border-2 p-3 text-center transition flex flex-col items-center gap-1"
                    style={{
                      borderColor: formData.gender === 'female' ? 'var(--app-rose)' : 'var(--app-border)',
                      background: formData.gender === 'female' ? 'rgba(240,98,146,0.12)' : 'var(--app-card)',
                      color: formData.gender === 'female' ? 'var(--app-rose)' : 'var(--app-text2)',
                      cursor: isGenderLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span className="text-xl">🧕🏻</span>
                    <span className="text-sm font-bold">Schwester</span>
                  </div>
                </div>
              </div>

              {/* ID NUMMER */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase ml-1" style={{ color: 'var(--app-text2)' }}>ID-Nummer</label>
                <div className="relative">
                  <BadgeInfo className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--app-text3)' }} />
                  <Input value={formData.memberId} onChange={(e) => setFormData({...formData, memberId: e.target.value})} className="pl-9" placeholder="z.B. 12345" />
                </div>
              </div>

              {/* NAME */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase ml-1" style={{ color: 'var(--app-text2)' }}>Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--app-text3)' }} />
                  <Input value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="pl-9" placeholder="Dein Name" />
                </div>
              </div>

              {/* HANDY */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase ml-1" style={{ color: 'var(--app-text2)' }}>Handynummer</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--app-text3)' }} />
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="pl-9" type="tel" placeholder="0176..." />
                </div>
              </div>

              <button type="submit" className="btn-gold w-full mt-4" disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Speichern
              </button>
            </form>

            {/* EINSTELLUNGEN */}
            <div className="mt-8 pt-6 space-y-6" style={{ borderTop: '1px solid var(--app-border)' }}>

              {/* PUSH */}
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--app-text)' }}>Benachrichtigungen</h3>
                <p className="text-xs" style={{ color: 'var(--app-text2)' }}>Push-Benachrichtigungen werden beim ersten Öffnen der App aktiviert.</p>
              </div>

              {/* GPS */}
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--app-text)' }}>GPS / Standort</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--app-text2)' }}>Wird benötigt, damit Fahrer und Mitfahrer sich finden.</p>
                <LocationSettings />
              </div>

              {/* KALENDER */}
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--app-text)' }}>Kalender</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--app-text2)' }}>Wähle, was du im Handy-Kalender sehen möchtest.</p>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', color: '#c2410c' }}
                    onClick={() => openCalendar('/api/calendar-events')}
                  >
                    <Calendar size={18} /> Veranstaltungen (Abo)
                  </button>

                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}
                    onClick={() => openCalendar('/api/calendar')}
                  >
                    <Calendar size={18} /> Gebetszeiten (Abo)
                  </button>

                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}
                    onClick={() => router.push('/events')}
                  >
                    <List size={18} /> Liste ansehen (Web)
                  </button>
                </div>
              </div>

              {/* SUPPORT */}
              <div className="pt-4" style={{ borderTop: '1px dashed var(--app-border)' }}>
                <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--app-text)' }}>Hilfe & Support</h3>
                <button
                  type="button"
                  onClick={() => openWhatsAppChat(ADMIN_WHATSAPP.replace(/[^0-9]/g, ''), "Salam, ich habe einen Fehler in der App gefunden:")}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}
                >
                  <MessageSquareWarning size={18} /> Fehler melden (WhatsApp)
                </button>
              </div>

              {/* ABMELDEN */}
              <div className="pt-4" style={{ borderTop: '1px dashed var(--app-border)' }}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(240,98,146,0.08)', border: '1px solid rgba(240,98,146,0.25)', color: 'var(--app-rose)' }}
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.replace('/login');
                  }}
                >
                  <LogOut size={18} /> Abmelden
                </button>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <StatsTab />
      )}
    </main>
  );
}

/* Statistik - 1:1 aus dem frueheren /history uebernommen (Zeilen ~683-745),
   nur der Ort auf dem Screen aendert sich: vorher hinter einer unnoetigen
   Tab-Leiste auf /history, jetzt als Reiter direkt im Profil. */
function StatsTab() {
  const [loading, setLoading] = useState(true);
  const [allRides, setAllRides] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: driverData } = await supabase.from('rides').select('ride_date').eq('driver_id', user.id).eq('status', 'completed');
      const driverRides = driverData?.map(r => ({ date: r.ride_date, role: 'driver' as const })) || [];

      const { data: myBookings } = await supabase.from('bookings').select('ride_id').eq('passenger_id', user.id);
      let passengerRides: any[] = [];
      if (myBookings?.length) {
        const rideIds = myBookings.map(b => b.ride_id);
        const { data: completedRides } = await supabase.from('rides').select('ride_date').in('id', rideIds).eq('status', 'completed');
        passengerRides = completedRides?.map(r => ({ date: r.ride_date, role: 'passenger' as const })) || [];
      }

      // Walk-in = automatisch per GPS erkannte Moschee-Anwesenheit, siehe
      // MosqueDetector.tsx -> mosque_visits.
      const { data: visitData } = await supabase.from('mosque_visits').select('visit_date').eq('user_id', user.id);
      const walkInRides = visitData?.map(v => ({ date: v.visit_date, role: 'walk-in' as const })) || [];

      setAllRides([...driverRides, ...passengerRides, ...walkInRides]);
      setLoading(false);
    };
    load();
  }, []);

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = new Date(year, month, 1).getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  const currentMonthRides = allRides.filter(r => {
    const [y, m] = r.date.split('-');
    return parseInt(y) === year && parseInt(m) === month + 1;
  });
  const totalCount = currentMonthRides.length;
  const driverCount = currentMonthRides.filter(r => r.role === 'driver').length;
  const passengerCount = currentMonthRides.filter(r => r.role === 'passenger').length;
  const walkInCount = currentMonthRides.filter(r => r.role === 'walk-in').length;

  const getDailyCount = (day: number) => {
    const dayStr = day.toString().padStart(2, '0');
    const fullDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayStr}`;
    return allRides.filter(r => r.date === fullDate).length;
  };

  const getRingStyle = (count: number) => {
    const p = Math.min(count * 20, 100);
    let c = 'var(--app-border)';
    if (count >= 5) c = 'var(--app-emerald)';
    else if (count >= 3) c = 'var(--app-blue)';
    else if (count > 0) c = 'var(--app-gold)';
    return { background: `conic-gradient(${c} ${p}%, var(--app-surface2) 0)` };
  };

  if (loading) {
    return <div className="py-10"><Loader2 className="animate-spin mx-auto" style={{ color: 'var(--app-text3)' }} /></div>;
  }

  return (
    <div className="w-full max-w-sm space-y-6 animate-in fade-in duration-300">
      <Card className="col-span-2 p-5 shadow-xl rounded-3xl flex justify-between items-center relative overflow-hidden" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
        <div className="relative z-10">
          <p className="text-xs uppercase font-bold tracking-widest mb-1" style={{ color: 'var(--app-text2)' }}>{monthName}</p>
          <div className="flex items-baseline gap-2"><span className="text-5xl font-black" style={{ color: 'var(--app-text)' }}>{totalCount}</span><span className="text-sm font-medium" style={{ color: 'var(--app-text2)' }}>Gebete</span></div>
        </div>
        <div className="p-3 rounded-full relative z-10" style={{ background: 'var(--app-gold-dim)', color: 'var(--app-gold)' }}><TrendingUp size={32} /></div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
          <div className="p-2 rounded-full" style={{ background: 'var(--app-gold-dim)', color: 'var(--app-gold)' }}><Car size={18} /></div>
          <span className="text-2xl font-black" style={{ color: 'var(--app-text)' }}>{driverCount}</span>
          <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: 'var(--app-text3)' }}>Fahrer</span>
        </div>
        <div className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
          <div className="p-2 rounded-full" style={{ background: 'var(--app-blue-dim)', color: 'var(--app-blue)' }}><User size={18} /></div>
          <span className="text-2xl font-black" style={{ color: 'var(--app-text)' }}>{passengerCount}</span>
          <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: 'var(--app-text3)' }}>Mitfahrer</span>
        </div>
        <div className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
          <div className="p-2 rounded-full" style={{ background: 'var(--app-emerald-dim)', color: 'var(--app-emerald)' }}><Footprints size={18} /></div>
          <span className="text-2xl font-black" style={{ color: 'var(--app-text)' }}>{walkInCount}</span>
          <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: 'var(--app-text3)' }}>Besucher</span>
        </div>
      </div>

      <div className="p-6 shadow-lg rounded-3xl" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <div className="text-center">
            <h2 className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>{monthName}</h2>
            <p className="text-xs font-bold uppercase" style={{ color: 'var(--app-text3)' }}>{year}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full"><ChevronRight className="h-6 w-6" /></Button>
        </div>

        <div className="grid grid-cols-7 gap-y-5 gap-x-1">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold uppercase" style={{ color: 'var(--app-text3)' }}>{d}</div>
          ))}
          {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`} />))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const count = getDailyCount(dayNum);
            const todayD = new Date();
            const isToday = year === todayD.getFullYear() && month === todayD.getMonth() && dayNum === todayD.getDate();
            return (
              <div key={dayNum} className="flex flex-col items-center gap-0.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition ${isToday ? 'ring-2 ring-offset-1' : ''}`}
                  style={{ ...getRingStyle(count), ...(isToday ? { outline: '2px solid var(--app-text)', outlineOffset: '1px' } : {}) }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm" style={{ background: 'var(--app-card)', color: 'var(--app-text)' }}>{dayNum}</div>
                </div>
                <span className="text-[8px] font-medium h-2.5 leading-none" style={{ color: 'var(--app-text3)' }}>{count > 0 ? `${count}×` : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
