'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, MapPin, Smartphone, Globe } from "lucide-react";
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

type OrgKey = 'ansar' | 'khuddam' | 'atfal' | 'lajna' | 'nasirat' | 'jamaat';

const ORG_META: Record<OrgKey, { label: string; color: string; dimColor: string }> = {
  ansar:   { label: 'Ansar',   color: '#f97316', dimColor: 'rgba(251,146,60,0.13)' },
  khuddam: { label: 'Khuddam', color: 'var(--app-blue)', dimColor: 'var(--app-blue-dim)' },
  atfal:   { label: 'Atfal',   color: 'var(--app-emerald)', dimColor: 'var(--app-emerald-dim)' },
  lajna:   { label: 'Lajna',   color: 'var(--app-rose)', dimColor: 'rgba(240,98,146,0.12)' },
  nasirat: { label: 'Nasirat', color: '#ec4899', dimColor: 'rgba(236,72,153,0.12)' },
  jamaat:  { label: 'Jamaat',  color: '#a78bfa', dimColor: 'rgba(167,139,250,0.12)' },
};

function normalizeOrg(v: any): OrgKey {
  const s = String(v ?? 'jamaat').toLowerCase().trim();
  if (s === 'ansar') return 'ansar';
  if (s === 'khuddam') return 'khuddam';
  if (s === 'atfal') return 'atfal';
  if (s === 'lajna') return 'lajna';
  if (s === 'nasirat') return 'nasirat';
  return 'jamaat';
}

function getTopOrgDots(dayEvents: any[]) {
  const uniqueOrgs: OrgKey[] = [];
  for (const e of dayEvents) {
    const o = normalizeOrg(e.org);
    if (!uniqueOrgs.includes(o)) uniqueOrgs.push(o);
    if (uniqueOrgs.length >= 3) break;
  }
  return uniqueOrgs;
}

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const parseEventEnd = (e: any) => new Date(e.event_end_date || e.event_date);

  const eventCoversDay = (e: any, day: Date) => {
    const s = startOfDay(new Date(e.event_date)).getTime();
    const en = startOfDay(parseEventEnd(e)).getTime();
    const d = startOfDay(day).getTime();
    return d >= s && d <= en;
  };

  const getDayInterval = (e: any, day: Date) => {
    const s = new Date(e.event_date).getTime();
    const en = parseEventEnd(e).getTime();
    const ds = startOfDay(day).getTime();
    const de = endOfDay(day).getTime();
    return { start: Math.max(s, ds), end: Math.min(en, de) };
  };

  const hasOverlap = (dayEvents: any[], day: Date) => {
    if (dayEvents.length < 2) return false;
    const intervals = dayEvents
      .map(e => getDayInterval(e, day))
      .sort((a, b) => a.start - b.start);

    let prevEnd = intervals[0].end;
    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i].start < prevEnd) return true;
      prevEnd = Math.max(prevEnd, intervals[i].end);
    }
    return false;
  };

  const formatTimeRange = (startStr: string, endStr?: string | null) => {
    const start = new Date(startStr);
    const startFmt = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (!endStr) return `${startFmt} Uhr`;
    const end = new Date(endStr);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 60_000) return `${startFmt} Uhr`;
    const endFmt = end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${startFmt} - ${endFmt} Uhr`;
  };

  const formatEventMeta = (e: any) => {
    const s = new Date(e.event_date);
    const en = parseEventEnd(e);
    if (isSameDay(s, en)) return formatTimeRange(e.event_date, e.event_end_date);
    const sFmt = s.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const eFmt = en.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return `${sFmt} - ${eFmt}`;
  };

  const formatDayBox = (e: any) => {
    const s = new Date(e.event_date);
    const en = parseEventEnd(e);
    const monthLabel = s.toLocaleDateString('de-DE', { month: 'short' }).toUpperCase();
    if (isSameDay(s, en)) return { monthLabel, dayLabel: String(s.getDate()) };
    return { monthLabel, dayLabel: `${s.getDate()}–${en.getDate()}` };
  };

  useEffect(() => {
    const load = async () => {
      const { data: eventsData } = await supabase
        .from('mosque_events')
        .select('id,title,event_date,event_end_date,location,description,org')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });
      if (eventsData) setEvents(eventsData);
      setLoading(false);
    };
    load();
  }, []);

  const openCalendarApple = (apiUrl: string) => {
    const host = window.location.host;
    window.location.href = `webcal://${host}${apiUrl}`;
  };

  const openCalendarGoogle = (apiUrl: string) => {
    const fullUrl = `${window.location.origin}${apiUrl}`;
    const url = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(fullUrl)}`;
    if (Capacitor.isNativePlatform()) Browser.open({ url });
    else window.open(url, '_blank');
  };

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = new Date(year, month, 1).getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  const getEventsForDay = (dayNum: number) => {
    const day = new Date(year, month, dayNum);
    return events
      .filter(e => eventCoversDay(e, day))
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  };

  const monthEvents = events.filter(e => {
    const s = new Date(e.event_date);
    const en = parseEventEnd(e);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59, 999);
    return en >= monthStart && s <= monthEnd;
  });

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pb-nav-safe" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full max-w-md mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--app-text)' }}>Termine</h1>
      </div>

      {loading ? (
        <div className="py-20"><Loader2 className="animate-spin" style={{ color: 'var(--app-text3)' }} /></div>
      ) : (
        <div className="w-full max-w-md space-y-6">
          <div className="p-6 shadow-lg rounded-3xl" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
            <div className="flex justify-between items-center mb-6">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
              <div className="text-center">
                <h2 className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>{monthName}</h2>
                <p className="text-xs font-bold uppercase" style={{ color: 'var(--app-text3)' }}>{year}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full"><ChevronRight className="h-6 w-6" /></Button>
            </div>

            <div className="grid grid-cols-7 gap-y-4 gap-x-2">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold uppercase" style={{ color: 'var(--app-text3)' }}>{d}</div>
              ))}
              {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`} />))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const day = new Date(year, month, dayNum);
                const dayEvents = getEventsForDay(dayNum);
                const hasEvent = dayEvents.length > 0;
                const overlap = hasOverlap(dayEvents, day);

                const mainOrg: OrgKey = hasEvent ? normalizeOrg(dayEvents[0].org) : 'jamaat';
                const meta = ORG_META[mainOrg];
                const dots = getTopOrgDots(dayEvents);

                const todayD = new Date();
                const isToday = year === todayD.getFullYear() && month === todayD.getMonth() && dayNum === todayD.getDate();

                return (
                  <div key={dayNum} className="flex flex-col items-center justify-center relative">
                    <button
                      onClick={() => hasEvent && setSelectedDay(dayNum)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition border font-bold ${isToday ? 'ring-2 ring-offset-1' : ''} ${hasEvent ? 'active:opacity-60' : ''}`}
                      style={{
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        cursor: hasEvent ? 'pointer' : 'default',
                        ...(!hasEvent
                          ? { background: 'var(--app-surface2)', color: 'var(--app-text3)', borderColor: 'var(--app-border)', fontWeight: 'normal', ...(isToday ? { outline: '2px solid var(--app-text)', outlineOffset: '2px' } : {}) }
                          : overlap
                            ? { background: 'var(--app-text)', color: 'var(--app-bg)', borderColor: 'var(--app-text)', ...(isToday ? { outline: '2px solid var(--app-text)', outlineOffset: '2px' } : {}) }
                            : { background: meta.dimColor, color: meta.color, borderColor: meta.color, ...(isToday ? { outline: '2px solid var(--app-text)', outlineOffset: '2px' } : {}) }
                        )
                      }}
                    >
                      {dayNum}
                    </button>

                    {hasEvent && (
                      <div className="absolute -bottom-1 flex items-center gap-1">
                        {dots.map((o) => (
                          <div key={o} className="w-1.5 h-1.5 rounded-full" style={{ background: ORG_META[o].color }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-[11px]">
              {(['ansar', 'khuddam', 'atfal', 'lajna', 'nasirat', 'jamaat'] as OrgKey[]).map((k) => (
                <div key={k} className="flex items-center gap-2 px-2 py-1 rounded-full" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: ORG_META[k].color }} />
                  <span className="font-bold" style={{ color: 'var(--app-text2)' }}>{ORG_META[k].label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-2 py-1 rounded-full" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--app-text)' }} />
                <span className="font-bold" style={{ color: 'var(--app-text2)' }}>Overlap</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--app-text2)' }}>Termine im {monthName}</h3>

            {monthEvents.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--app-text3)' }}>Keine Termine in diesem Monat.</p>
            ) : (
              monthEvents.map(e => {
                const org = normalizeOrg(e.org);
                const meta = ORG_META[org];
                const box = formatDayBox(e);

                return (
                  <div key={e.id} className="rounded-2xl shadow-sm overflow-hidden flex" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                    <div className="w-1.5 shrink-0" style={{ background: meta.color }} />
                    <div className="p-4 flex gap-3 flex-1">
                      <div className="px-3 py-2 rounded-xl text-center min-w-[3.5rem] flex flex-col items-center justify-center" style={{ background: meta.dimColor }}>
                        <span className="text-[10px] font-bold uppercase" style={{ color: meta.color }}>{box.monthLabel}</span>
                        <span className="text-xl font-black leading-tight" style={{ color: 'var(--app-text)' }}>{box.dayLabel}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold leading-snug" style={{ color: 'var(--app-text)' }}>{e.title}</h3>
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ background: meta.dimColor, color: meta.color }}>
                            {meta.label}
                          </span>
                        </div>

                        <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--app-text2)' }}>
                          {formatEventMeta(e)}
                        </p>

                        <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--app-text3)' }}>
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{e.location || "Moschee"}</span>
                        </div>

                        {e.description && <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--app-text2)' }}>{e.description}</p>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--app-text3)' }}>Kalender abonnieren</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="flex items-center gap-2 text-xs"
                style={{ background: 'var(--app-card)', borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
                onClick={() => openCalendarApple('/api/calendar-events')}
              >
                <Smartphone size={15} /> Apple
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 text-xs"
                style={{ background: 'var(--app-card)', borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
                onClick={() => openCalendarGoogle('/api/calendar-events')}
              >
                <Globe size={15} /> Google
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedDay !== null && (() => {
        const dayEvents = getEventsForDay(selectedDay);
        const dateLabel = new Date(year, month, selectedDay).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
        return (
          <div
            className="fixed inset-0 z-[60] flex items-end"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setSelectedDay(null)}
          >
            <div
              className="w-full max-h-[80vh] overflow-y-auto rounded-t-3xl animate-in slide-in-from-bottom-4 duration-300"
              style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 5rem), 5.5rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-4 pb-3">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--app-border)' }} />
              </div>
              <div className="px-6 pb-4">
                <h3 className="text-base font-extrabold mb-1" style={{ color: 'var(--app-text)' }}>{dateLabel}</h3>
                <p className="text-xs mb-4 font-bold uppercase tracking-wide" style={{ color: 'var(--app-text3)' }}>
                  {dayEvents.length} {dayEvents.length === 1 ? 'Termin' : 'Termine'}
                </p>
                <div className="space-y-3">
                  {dayEvents.map((e) => {
                    const org = normalizeOrg(e.org);
                    const meta = ORG_META[org];
                    return (
                      <div key={e.id} className="rounded-2xl overflow-hidden flex" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                        <div className="w-1.5 shrink-0" style={{ background: meta.color }} />
                        <div className="p-3 flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-bold text-sm leading-snug" style={{ color: 'var(--app-text)' }}>{e.title}</p>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ background: meta.dimColor, color: meta.color }}>{meta.label}</span>
                          </div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--app-text2)' }}>{formatEventMeta(e)}</p>
                          {e.description && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--app-text2)' }}>{e.description}</p>}
                          {e.location && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--app-text3)' }}>
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">{e.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
