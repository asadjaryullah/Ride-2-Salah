'use client';

import { useEffect, useState, useRef } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, Check, RotateCcw, Clock, GraduationCap, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { todayBerlin } from '@/lib/date';

// Gleiche Keys wie in src/app/learn/page.tsx - rein lokal (localStorage),
// keine eigene DB-Tabelle dafuer.
const LEARN_WORDS_KEY = 'namaz_words_v4';
const LEARN_PROGRESS_KEY = 'namaz_learn_v4';

// --- KONFIGURATION ZIKR (unveraendert aus dem frueheren /history uebernommen) ---
const ZIKR_LIST = [
  {
    key: 'zikr1_count',
    target: 200,
    theme: { cardBg: 'rgba(240,98,146,0.07)', cardBorder: 'rgba(240,98,146,0.20)', accent: 'var(--app-rose)' },
    arabic: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ\nسُبْحَانَ اللّٰهِ العَظِيمِ\nاللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ\nوَآلِ مُحَمَّدٍ",
    translation: "Heilig ist Allah und jeder Verehrung würdig. Erhaben ist Allah, der Größte. O Allah, schütte Deine Gnade aus über Muhammadsaw und seinen Anhängern.",
    title: "Tasbih & Salawat"
  },
  {
    key: 'zikr2_count',
    target: 100,
    theme: { cardBg: 'var(--app-blue-dim)', cardBorder: 'rgba(91,127,255,0.25)', accent: 'var(--app-blue)' },
    arabic: "أَسْتَغْفِرُ اللّٰهَ رَبِّي\nمِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ",
    translation: "Ich ersuche Vergebung bei Allah, meinem Herrn, für all meine Sünden und wende mich zu Ihm in Reue.",
    title: "Istighfar"
  },
  {
    key: 'zikr3_count',
    target: 100,
    theme: { cardBg: 'var(--app-gold-dim)', cardBorder: 'rgba(201,162,60,0.30)', accent: 'var(--app-gold)' },
    arabic: "رَبِّ كُلُّ شَيْءٍ خَادِمُكَ\nرَبِّ فَاحْفَظْنِي وَانْصُرْنِي وَارْحَمْنِي",
    translation: "O mein Herr, alles ist Dein Diener. O mein Herr, beschütze mich und hilf mir und sei mir gnädig.",
    title: "Dua"
  }
];

type Prayer = { id: string; name: string; time: string };

function minutesUntil(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const nowBerlin = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
  const target = new Date(nowBerlin);
  target.setHours(h, m, 0, 0);
  let diff = Math.round((target.getTime() - nowBerlin.getTime()) / 60000);
  if (diff < -5) diff += 24 * 60; // schon vorbei -> naechster Tag, nur fuer Sortierung irrelevant hier
  return diff;
}

function formatCountdown(mins: number): string {
  if (mins < 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `noch ${h} Std ${m} Min`;
  return `noch ${m} Min`;
}

export default function NamazPage() {
  const router = useTransitionRouter();

  const [loading, setLoading] = useState(true);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [nowHHMM, setNowHHMM] = useState('');

  const [zikrData, setZikrData] = useState<any>({ zikr1_count: 0, zikr2_count: 0, zikr3_count: 0 });
  const [todayLogId, setTodayLogId] = useState<string | null>(null);
  const [dailyQuote, setDailyQuote] = useState<any | null>(null);

  // Lernfortschritt "Namaz mit Uebersetzung" (/learn) - rein lokal im
  // Browser gespeichert, hier nur fuer die Fortschrittsanzeige ausgelesen.
  const [learnStats, setLearnStats] = useState({ learned: 0, total: 103 });
  useEffect(() => {
    try {
      const wordsRaw = localStorage.getItem(LEARN_WORDS_KEY);
      const total = wordsRaw ? (JSON.parse(wordsRaw).length || 103) : 103;
      const progressRaw = localStorage.getItem(LEARN_PROGRESS_KEY);
      const progress = progressRaw ? JSON.parse(progressRaw) : {};
      const learned = Object.values(progress).filter((p: any) => p?.learned).length;
      setLearnStats({ learned, total });
    } catch {}
  }, []);

  // Live-Uhrzeit in Berlin-Zeitzone, jede Minute aktualisiert - reicht fuer
  // einen Countdown in Minuten, eine Sekunden-Genauigkeit braucht niemand hier.
  useEffect(() => {
    const update = () => setNowHHMM(new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(`zikr_${todayBerlin()}`);
      if (cached) setZikrData(JSON.parse(cached));
    } catch {}

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const today = todayBerlin();

      const [{ data: prayerTimesData }, { data: zikrLog, error: zikrErr }, { data: quotesData }] = await Promise.all([
        supabase.from('prayer_times').select('id,name,time').order('sort_order', { ascending: true }),
        supabase.from('zikr_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle(),
        supabase.from('daily_quotes').select('arabic, translation, source').eq('is_active', true).order('sort_order', { ascending: true }),
      ]);

      if (prayerTimesData) setPrayers(prayerTimesData);

      if (zikrErr) {
        console.error('zikr_logs laden:', zikrErr.message);
        toast.error('Zikr-Zaehler konnte nicht geladen werden.');
      }

      if (zikrLog) {
        let merged = zikrLog;
        try {
          const cachedRaw = localStorage.getItem(`zikr_${today}`);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const ahead: Record<string, number> = {};
            for (const { key } of ZIKR_LIST) {
              const lokal = Number(cached?.[key] ?? 0);
              if (lokal > Number(zikrLog[key] ?? 0)) ahead[key] = lokal;
            }
            if (Object.keys(ahead).length > 0) {
              merged = { ...zikrLog, ...ahead };
              const { error } = await supabase.from('zikr_logs').update(ahead).eq('id', zikrLog.id);
              if (error) console.error('zikr_logs nachtragen:', error.message);
            }
          }
        } catch {}
        setZikrData(merged);
        setTodayLogId(merged.id);
        try { localStorage.setItem(`zikr_${today}`, JSON.stringify(merged)); } catch {}
      } else {
        const { data: newLog, error: insErr } = await supabase
          .from('zikr_logs').insert({ user_id: user.id, log_date: today }).select().maybeSingle();
        if (insErr || !newLog) {
          console.error('zikr_logs anlegen:', insErr?.message);
          toast.error('Zikr-Zaehler konnte nicht angelegt werden — Zaehlen geht, Speichern noch nicht.');
        } else {
          setTodayLogId(newLog.id);
          setZikrData(newLog);
        }
      }

      if (quotesData?.length) {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        setDailyQuote(quotesData[dayOfYear % quotesData.length]);
      }

      setLoading(false);
    };

    load();
  }, []);

  const zikrDateKey = `zikr_${todayBerlin()}`;
  const saveLocal = (data: any) => { try { localStorage.setItem(zikrDateKey, JSON.stringify(data)); } catch {} };

  const onlyCounters = (data: any): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const { key } of ZIKR_LIST) out[key] = Number(data?.[key] ?? 0);
    return out;
  };

  /* Der letzte noch nicht geschriebene Stand. Ohne diesen Zwischenspeicher ging
     alles verloren, was innerhalb der 800ms Wartezeit getippt und dann durch
     Verlassen der Seite unterbrochen wurde - gleiche Logik wie urspruenglich
     im Zikr-Tab von /history. */
  const pendingRef = useRef<Record<string, number> | null>(null);
  const logIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => { logIdRef.current = todayLogId; }, [todayLogId]);

  const flushToDb = async () => {
    const payload = pendingRef.current;
    const id = logIdRef.current;
    if (!payload) return;
    if (!id) {
      toast.error('Zikr wird lokal gezaehlt, aber nicht gespeichert.');
      return;
    }
    pendingRef.current = null;
    const { error } = await supabase.from('zikr_logs').update(payload).eq('id', id);
    if (error) {
      console.error('zikr_logs speichern:', error.message);
      pendingRef.current = payload;
      toast.error('Zikr konnte nicht gespeichert werden.');
    }
  };

  const saveToDb = (newData: any) => {
    pendingRef.current = onlyCounters(newData);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(flushToDb, 800);
  };

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && pendingRef.current) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        void flushToDb();
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      void flushToDb();
    };
  }, []);

  const handleZikrClick = (key: string, target: number) => {
    const v = zikrData[key] || 0;
    if (v >= target) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    const newData = { ...zikrData, [key]: v + 1 };
    setZikrData(newData);
    saveLocal(newData);
    saveToDb(newData);
  };

  const handleReset = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    toast("Zähler zurücksetzen?", {
      action: {
        label: "Zurücksetzen",
        onClick: () => {
          const newData = { ...zikrData, [key]: 0 };
          setZikrData(newData);
          saveLocal(newData);
          saveToDb(newData);
        },
      },
      cancel: { label: "Abbrechen", onClick: () => {} },
    });
  };

  const nextIndex = prayers.findIndex(p => p.time > nowHHMM);
  const nextPrayerId = nextIndex === -1 ? prayers[0]?.id : prayers[nextIndex].id;

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pb-nav-safe" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full max-w-md flex items-center mb-6">
        <button onClick={() => router.push('/')} className="p-2 -ml-2 rounded-full" aria-label="Zurück">
          <ArrowLeft className="h-6 w-6" style={{ color: 'var(--app-text2)' }} />
        </button>
        <h1 className="text-xl font-bold ml-2" style={{ color: 'var(--app-text)' }}>Namaz</h1>
      </div>

      {loading ? (
        <div className="py-20"><Loader2 className="animate-spin" style={{ color: 'var(--app-text3)' }} /></div>
      ) : (
        <div className="w-full max-w-md space-y-6">
          {/* GEBETSZEITEN */}
          <div className="space-y-2">
            {prayers.map((p) => {
              const isNext = p.id === nextPrayerId;
              const mins = minutesUntil(p.time);
              return (
                <Card
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-2xl"
                  style={{
                    background: isNext ? 'var(--app-gold-dim)' : 'var(--app-card)',
                    border: `1px solid ${isNext ? 'var(--app-gold)' : 'var(--app-border)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full" style={{ background: isNext ? 'rgba(201,162,60,0.2)' : 'var(--app-surface2)' }}>
                      <Clock size={16} style={{ color: isNext ? 'var(--app-gold)' : 'var(--app-text3)' }} />
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: isNext ? 'var(--app-gold)' : 'var(--app-text)' }}>{p.name}</p>
                      {isNext && mins >= 0 && (
                        <p className="text-xs font-semibold" style={{ color: 'var(--app-gold)' }}>{formatCountdown(mins)}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-lg font-black" style={{ color: isNext ? 'var(--app-gold)' : 'var(--app-text)' }}>{p.time}</span>
                </Card>
              );
            })}
          </div>

          {/* ZIKR */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--app-text2)' }}>Täglicher Zikr</h2>

            {dailyQuote && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}>
                {dailyQuote.arabic && (
                  <p className="text-xl text-center leading-loose mb-2 font-bold"
                    style={{ fontFamily: 'var(--font-amiri)', direction: 'rtl', color: 'var(--app-gold)', textShadow: '0 0 20px var(--app-gold-glow)' }}>
                    {dailyQuote.arabic}
                  </p>
                )}
                <p className="text-sm text-center italic leading-relaxed" style={{ color: 'var(--app-text)' }}>
                  „{dailyQuote.translation}"
                </p>
                {dailyQuote.source && (
                  <p className="text-[10px] text-center mt-2 font-bold uppercase tracking-widest" style={{ color: 'var(--app-text3)' }}>
                    — {dailyQuote.source}
                  </p>
                )}
              </div>
            )}

            {ZIKR_LIST.map((item) => {
              const count = zikrData[item.key] || 0;
              const isDone = count >= item.target;
              const progress = Math.min((count / item.target) * 100, 100);

              return (
                <Card
                  key={item.key}
                  onClick={() => !isDone && handleZikrClick(item.key, item.target)}
                  className="relative overflow-hidden transition-opacity duration-150 shadow-md active:opacity-60"
                  style={{
                    background: isDone ? 'var(--app-emerald)' : item.theme.cardBg,
                    border: `1px solid ${isDone ? 'var(--app-emerald)' : item.theme.cardBorder}`,
                    cursor: isDone ? 'default' : 'pointer',
                  }}
                >
                  {isDone && <div className="absolute right-[-20px] bottom-[-20px] transform rotate-12" style={{ color: 'rgba(255,255,255,0.2)' }}><Check size={120} /></div>}
                  {!isDone && <div className="absolute bottom-0 left-0 h-1.5 transition-[width] duration-300" style={{ width: `${progress}%`, background: item.theme.accent }} />}
                  {count > 0 && !isDone && (
                    <div className="absolute top-3 left-3 z-10">
                      <button onClick={(e) => handleReset(e, item.key)} className="p-1.5 rounded-full transition shadow-sm" style={{ background: 'var(--app-surface2)', color: 'var(--app-text3)' }}>
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  )}
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] pt-2">
                      <span className="text-3xl font-black" style={{ color: isDone ? '#fff' : item.theme.accent }}>{count}</span>
                      <span className="text-[9px] font-bold uppercase" style={{ color: isDone ? 'rgba(255,255,255,0.7)' : 'var(--app-text3)' }}>{isDone ? 'FERTIG' : `von ${item.target}`}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-end text-right">
                      <p className="text-xs font-bold uppercase mb-2 tracking-widest" style={{ color: isDone ? 'rgba(255,255,255,0.7)' : 'var(--app-text3)' }}>{item.title}</p>
                      <p className="text-xl font-bold leading-loose" style={{ fontFamily: 'var(--font-amiri)', direction: 'rtl', lineHeight: '1.8', color: isDone ? '#fff' : 'var(--app-text)' }}>
                        {item.arabic}
                      </p>
                      <p className="text-xs mt-3 italic leading-relaxed text-right w-full" style={{ color: isDone ? 'rgba(255,255,255,0.7)' : 'var(--app-text2)' }}>{item.translation}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* NAMAZ MIT UEBERSETZUNG - Lernfortschritt */}
          <div
            onClick={() => router.push('/learn')}
            className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
            style={{ background: 'var(--app-blue-dim)', border: '1px solid var(--app-blue)' }}
          >
            <div className="p-2.5 rounded-full shrink-0" style={{ background: 'rgba(91,127,255,0.15)' }}>
              <GraduationCap size={20} style={{ color: 'var(--app-blue)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: 'var(--app-blue)' }}>Namaz mit Übersetzung</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--app-surface2)' }}>
                  <div
                    className="h-full transition-[width] duration-300"
                    style={{ width: `${Math.min((learnStats.learned / learnStats.total) * 100, 100)}%`, background: 'var(--app-blue)' }}
                  />
                </div>
                <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--app-text2)' }}>
                  {learnStats.learned}/{learnStats.total}
                </span>
              </div>
            </div>
            <ArrowRight size={16} className="shrink-0" style={{ color: 'var(--app-blue)' }} />
          </div>
        </div>
      )}
    </main>
  );
}
