'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTransitionRouter } from 'next-view-transitions';
import { Home, Car, CalendarDays, UserRound, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { todayBerlin } from '@/lib/date';
import NamazIcon from '@/components/icons/NamazIcon';
import { Capacitor } from '@capacitor/core';
import { NativeBottomBar } from '@/lib/native-bottom-bar';

const HIDDEN_PATHS = [
  '/login',
  '/complete-profile',
  '/driver/dashboard',
  '/passenger/dashboard',
  '/select-prayer',
  '/passenger/list',
  '/offline',
];

/* Ausserhalb der Komponente, weil sich nichts davon je aendert - die
   native iOS-Bar muss beim Zurueckrouten von 'tabTapped' dieselben
   href-Werte kennen, ohne dass dafuer bei jedem Render neue Objekte
   entstehen muessen. */
const LEFT_TABS = [
  { id: 'namaz', label: 'Namaz', icon: NamazIcon, href: '/namaz' },
  { id: 'termine', label: 'Termine', icon: CalendarDays, href: '/events' },
];
const RIGHT_TABS = [
  { id: 'fahrt', label: 'Fahrt', icon: Car, href: null as string | null },
  { id: 'profil', label: 'Profil', icon: UserRound, href: '/profile' },
];
const ALL_TABS = [...LEFT_TABS, ...RIGHT_TABS];

// Gleiches Muster wie StatusBarManager.tsx - Theme folgt entweder dem
// manuell gesetzten data-theme-Attribut oder der Systemeinstellung.
function getEffectiveTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function BottomNav() {
  const router = useTransitionRouter();
  const pathname = usePathname();
  const [showFahrtSheet, setShowFahrtSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);

  // Nur iOS hat bisher eine echte native Bar (NativeBottomBarView.swift) -
  // Android faellt bis zum ersten Android-Build auf die HTML-Bar zurueck.
  const isNative = Capacitor.getPlatform() === 'ios';

  /* Aktive Fahrt heute (als Fahrer oder Mitfahrer) - damit der "Fahrt"-Knopf
     unten direkt zur eigenen Uebersicht springt, statt immer wieder dieselbe
     Rollenauswahl zu zeigen, die man fuer heute schon getroffen hat. Gleiche
     Abfrage wie auf der Startseite (page.tsx), hier nochmal, weil BottomNav
     im Layout global sitzt und keinen Zugriff auf den Zustand der Startseite
     hat. */
  const [activeRideRoute, setActiveRideRoute] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
      if (session?.user) loadActiveRide(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session?.user);
      if (session?.user) loadActiveRide(session.user.id);
      else setActiveRideRoute(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadActiveRide = async (userId: string) => {
    const today = todayBerlin();
    const [{ data: driverRide }, { data: booking }] = await Promise.all([
      supabase.from('rides').select('id').eq('driver_id', userId).eq('status', 'active').eq('ride_date', today).limit(1).maybeSingle(),
      supabase.from('bookings').select('ride_id, rides!inner(status, ride_date)').eq('passenger_id', userId).eq('status', 'accepted').eq('rides.status', 'active').eq('rides.ride_date', today).limit(1).maybeSingle(),
    ]);
    if (driverRide) setActiveRideRoute('/driver/dashboard');
    else if (booking) setActiveRideRoute(`/passenger/dashboard?rideId=${booking.ride_id}`);
    else setActiveRideRoute(null);
  };

  useEffect(() => {
    if (pathname === '/') {
      setActiveTab('home');
    } else if (pathname.startsWith('/namaz')) {
      setActiveTab('namaz');
    } else if (pathname.startsWith('/events')) {
      setActiveTab('termine');
    } else if (pathname.startsWith('/profile') || pathname.startsWith('/admin')) {
      setActiveTab('profil');
    } else if (
      pathname.startsWith('/select-prayer') ||
      pathname.startsWith('/passenger/list') ||
      pathname.startsWith('/arrival')
    ) {
      setActiveTab('fahrt');
    } else {
      setActiveTab('');
    }

    // Zurueck auf der Startseite ist der natuerliche Punkt, an dem eine
    // gerade abgeschlossene/abgebrochene Fahrt nicht mehr "aktiv" sein
    // sollte - hier erneut pruefen, statt nur bei An-/Abmeldung.
    if (pathname === '/') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) loadActiveRide(session.user.id);
      });
    }
  }, [pathname]);

  const handleTabPress = (id: string, href: string | null) => {
    if (id === 'fahrt') {
      // Fuer heute schon eine Rolle gewaehlt? Dann direkt zur eigenen
      // Uebersicht, statt die Auswahl (Fahrer/Mitfahrer) nochmal zu zeigen,
      // die fuer heute bereits beantwortet ist.
      if (activeRideRoute) {
        router.push(activeRideRoute);
      } else {
        setShowFahrtSheet(true);
      }
    } else if (href) {
      setActiveTab(id);
      router.push(href);
    }
  };

  /* Sichtbarkeit + aktiver Tab an die native Bar melden, unabhaengig davon,
     ob die Komponente am Ende ueberhaupt HTML rendert (die fruehen Returns
     unten betreffen nur die Web-JSX, nicht diese Effekte).

     !showFahrtSheet ist hier kein Stilmittel, sondern noetig: die native Bar
     liegt als eigene UIKit-Ebene UEBER der kompletten WKWebView - ein
     web-gerendertes Sheet mit noch so hohem z-index kann sie nie verdecken.
     Ohne diese Zeile schien die Bar durch das Fahrt-Sheet hindurch. */
  const visible = isLoggedIn && !HIDDEN_PATHS.some(p => pathname.startsWith(p)) && !showFahrtSheet;
  useEffect(() => {
    if (!isNative) return;
    NativeBottomBar.setState({ visible, activeTab }).catch(() => {});
  }, [isNative, visible, activeTab]);

  useEffect(() => {
    if (!isNative) return;
    const apply = () => NativeBottomBar.setTheme({ theme: getEffectiveTheme() }).catch(() => {});
    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', apply);
    };
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;
    const sub = NativeBottomBar.addListener('tabTapped', ({ tab }) => {
      if (tab === 'home') {
        router.push('/');
        return;
      }
      const match = ALL_TABS.find((t) => t.id === tab);
      if (match) handleTabPress(match.id, match.href);
    });
    return () => { sub.then((handle) => handle.remove()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative, activeRideRoute]);

  if (!isLoggedIn) return null;
  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  const leftTabs = LEFT_TABS;
  const rightTabs = RIGHT_TABS;

  const renderTab = (tab: { id: string; label: string; icon: React.ElementType; href: string | null }) => {
    const active = activeTab === tab.id;
    const Icon = tab.icon;
    return (
      <button
        key={tab.id}
        onClick={() => handleTabPress(tab.id, tab.href)}
        className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 active:scale-[0.92] transition-transform duration-100"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        aria-label={tab.label}
      >
        <span
          className="flex items-center justify-center rounded-xl transition-colors duration-150"
          style={{
            width: 44,
            height: 30,
            background: active ? 'var(--app-gold-dim)' : 'transparent',
          }}
        >
          <Icon
            size={20}
            strokeWidth={active ? 2.4 : 1.7}
            style={{ color: active ? 'var(--app-gold)' : 'var(--app-text3)' }}
          />
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-widest leading-none transition-colors duration-150"
          style={{ color: active ? 'var(--app-gold)' : 'var(--app-text3)' }}
        >
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* ── Bottom Navigation Bar ─────────────────────────────────────────── */}
      {/* Auf iOS uebernimmt NativeBottomBarView.swift die eigentliche Bar
          (siehe die Sync-Effekte oben) - hier nur noch der Fahrt-Sheet, der
          weiterhin web-gerendert ueber der WKWebView liegt. */}
      {!isNative && (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch select-none"
        style={{
          background: 'color-mix(in srgb, var(--app-surface1) 94%, transparent)',
          borderTop: '1px solid var(--app-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          overflow: 'visible',
        }}
      >
        {/* Left tabs */}
        {leftTabs.map(renderTab)}

        {/* Center Start button */}
        <div className="flex-1 flex flex-col items-center justify-center py-3">
          <button
            onClick={() => router.push('/')}
            aria-label="Start"
            className="flex items-center justify-center active:scale-[0.90] transition-transform duration-100"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: activeTab === 'home' ? 'var(--app-gold)' : 'var(--app-gold-dim)',
              border: '2px solid var(--app-gold)',
              boxShadow: activeTab === 'home'
                ? '0 4px 20px rgba(201,162,60,0.5)'
                : '0 2px 12px rgba(201,162,60,0.25)',
              marginTop: -18,
            }}
          >
            <Home
              size={22}
              strokeWidth={2.2}
              style={{ color: activeTab === 'home' ? '#fff' : 'var(--app-gold)' }}
            />
          </button>
          <span
            className="text-[9px] font-bold uppercase tracking-widest leading-none mt-1.5 transition-colors duration-150"
            style={{ color: activeTab === 'home' ? 'var(--app-gold)' : 'var(--app-text3)' }}
          >
            Start
          </span>
        </div>

        {/* Right tabs */}
        {rightTabs.map(renderTab)}
      </nav>
      )}

      {/* ── Fahrt Bottom Sheet ────────────────────────────────────────────── */}
      {showFahrtSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end animate-in fade-in duration-150"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => { setShowFahrtSheet(false); setSheetOffset(0); }}
        >
          <div
            className="w-full rounded-t-3xl animate-in slide-in-from-bottom-4 duration-300 ease-out"
            style={{
              background: 'var(--app-surface2)',
              border: '1px solid var(--app-border)',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
              transform: `translateY(${sheetOffset}px)`,
              transition: sheetOffset === 0 ? 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-4 pb-5 cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                dragStartY.current = e.clientY;
                dragStartTime.current = Date.now();
              }}
              onPointerMove={(e) => {
                const dy = e.clientY - dragStartY.current;
                if (dy > 0) setSheetOffset(dy);
              }}
              onPointerUp={(e) => {
                const dy = e.clientY - dragStartY.current;
                const dt = Date.now() - dragStartTime.current;
                const velocity = dy / dt;
                if (velocity > 0.4 || dy > 100) {
                  setShowFahrtSheet(false);
                  setSheetOffset(0);
                } else {
                  setSheetOffset(0);
                }
              }}
            >
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--app-border)' }} />
            </div>

            <div className="px-6 pb-2">
              <h3
                className="text-base font-extrabold text-center mb-1"
                style={{ color: 'var(--app-text)', letterSpacing: '-0.01em' }}
              >
                Wie fährst du heute?
              </h3>
              <p className="text-xs text-center mb-5" style={{ color: 'var(--app-text3)' }}>
                Wähle deine Rolle für diese Fahrt
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Fahrer */}
                <button
                  onClick={() => {
                    setShowFahrtSheet(false);
                    router.push('/select-prayer?role=driver');
                  }}
                  className="rounded-2xl p-5 text-left active:scale-[0.96] transition-transform"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: 'rgba(201,162,60,0.2)', border: '1px solid var(--app-gold)' }}
                  >
                    <Car size={20} style={{ color: 'var(--app-gold)' }} />
                  </div>
                  <p className="font-extrabold text-[15px]" style={{ color: 'var(--app-gold)' }}>
                    Fahrer
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>
                    Plätze anbieten
                  </p>
                </button>

                {/* Mitfahrer */}
                <button
                  onClick={() => {
                    setShowFahrtSheet(false);
                    router.push('/select-prayer?role=passenger');
                  }}
                  className="rounded-2xl p-5 text-left active:scale-[0.96] transition-transform"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'var(--app-blue-dim)', border: '1px solid var(--app-blue)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: 'rgba(91,127,255,0.15)', border: '1px solid var(--app-blue)' }}
                  >
                    <Navigation size={20} style={{ color: 'var(--app-blue)' }} />
                  </div>
                  <p className="font-extrabold text-[15px]" style={{ color: 'var(--app-blue)' }}>
                    Mitfahrer
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>
                    Fahrt finden
                  </p>
                </button>
              </div>

              <button
                onClick={() => setShowFahrtSheet(false)}
                className="w-full py-3 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'var(--app-surface1)', border: '1px solid var(--app-border)', color: 'var(--app-text3)' }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
