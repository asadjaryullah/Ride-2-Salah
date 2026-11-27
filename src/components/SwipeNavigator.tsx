'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTransitionRouter } from 'next-view-transitions';
import { Capacitor } from '@capacitor/core';

/* Reihenfolge wie in der Bottom-Bar, aber ohne "Fahrt": der Tab hat kein
   einzelnes festes Ziel (Sheet oder aktive-Fahrt-Route je nach Kontext),
   dafuer gibt es beim Wischen keinen sinnvollen einzelnen Sprungpunkt. */
const SWIPE_ORDER = [
  { id: 'namaz', href: '/namaz' },
  { id: 'termine', href: '/events' },
  { id: 'home', href: '/' },
  { id: 'profil', href: '/profile' },
];

function currentIndex(pathname: string): number {
  if (pathname === '/') return SWIPE_ORDER.findIndex(t => t.id === 'home');
  if (pathname.startsWith('/namaz')) return SWIPE_ORDER.findIndex(t => t.id === 'namaz');
  if (pathname.startsWith('/events')) return SWIPE_ORDER.findIndex(t => t.id === 'termine');
  if (pathname.startsWith('/profile')) return SWIPE_ORDER.findIndex(t => t.id === 'profil');
  return -1;
}

const EDGE_RESERVED_PX = 32; // links fuer die native Zurueck-Wisch-Geste freihalten
const MIN_DISTANCE_PX = 80;

export default function SwipeNavigator() {
  const router = useTransitionRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (e.clientX < EDGE_RESERVED_PX) { start.current = null; return; }
      start.current = { x: e.clientX, y: e.clientY };
    };

    const onUp = (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;

      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) < MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const idx = currentIndex(pathnameRef.current);
      if (idx === -1) return;

      // Nach links wischen = vorwaerts (naechster Tab rechts), nach rechts = zurueck.
      const forward = dx < 0;
      const nextIdx = forward ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= SWIPE_ORDER.length) return;

      /* Signalisiert der CSS in globals.css, dass die naechste Seiten-
         Transition dem Wisch folgen soll (Hinein-/Hinausschieben) statt des
         generischen Ein-/Ausblendens bei einem normalen Tab-Tipp. Wird nach
         der Transition wieder entfernt, sonst wuerde ein spaeterer Tab-Tipp
         faelschlich auch seitlich schieben. */
      document.documentElement.setAttribute('data-nav-direction', forward ? 'forward' : 'back');
      router.push(SWIPE_ORDER[nextIdx].href);
      setTimeout(() => document.documentElement.removeAttribute('data-nav-direction'), 500);
    };

    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
    };
  }, [router]);

  return null;
}
