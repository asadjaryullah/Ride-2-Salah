'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTransitionRouter } from 'next-view-transitions';
import { Home, Car, CalendarDays, UserRound, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { todayBerlin } from '@/lib/date';
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
  { id: 'namaz', label: 'Zikr', icon: BookOpen, href: '/namaz' },
  { id: 'termine', label: 'Termine', icon: CalendarDays, href: '/events' },
];
const RIGHT_TABS = [
  { id: 'fahrt', label: 'Fahrt', icon: Car, href: '/fahrt' },
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
  const [activeTab, setActiveTab] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Nur iOS hat bisher eine echte native Bar (NativeBottomBarView.swift) -
  // Android faellt bis zum ersten Android-Build auf die HTML-Bar zurueck.
  const isNative = Capacitor.getPlatform() === 'ios';

  /* Aktive Fahrt heute (als Fahrer oder Mitfahrer) - damit der "Fahrt"-Knopf
     unten direkt zur eigenen Uebersicht springt, statt immer wieder die
     eigene /fahrt-Seite zu zeigen, wenn fuer heute schon eine Rolle feststeht.
     Gleiche Abfrage wie auf der Startseite (page.tsx), hier nochmal, weil
     BottomNav im Layout global sitzt und keinen Zugriff auf deren Zustand hat. */
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
      pathname.startsWith('/fahrt') ||
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
    if (id === 'fahrt' && activeRideRoute) {
      // Fuer heute schon eine Rolle gewaehlt? Dann direkt zur eigenen
      // Uebersicht, statt nochmal die /fahrt-Seite zu zeigen, die fuer
      // heute bereits beantwortet ist.
      router.push(activeRideRoute);
    } else if (href) {
      setActiveTab(id);
      router.push(href);
    }
  };

  // Sichtbarkeit + aktiver Tab an die native Bar melden, unabhaengig davon,
  // ob die Komponente am Ende ueberhaupt HTML rendert (die fruehen Returns
  // unten betreffen nur die Web-JSX, nicht diese Effekte).
  const visible = isLoggedIn && !HIDDEN_PATHS.some(p => pathname.startsWith(p));
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
          (siehe die Sync-Effekte oben) - diese Komponente synchronisiert dort
          nur noch Zustand, rendert aber kein eigenes HTML. */}
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
        {LEFT_TABS.map(renderTab)}

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
        {RIGHT_TABS.map(renderTab)}
      </nav>
      )}
    </>
  );
}
