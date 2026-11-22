'use client';

import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { hapticTap } from '@/lib/haptics';

const TRIGGER_DISTANCE = 70;
const MAX_PULL = 110;

/**
 * Zieht man ganz oben auf der Seite (window.scrollY === 0) nach unten,
 * laedt die App neu - klassisches natives Muster, das bisher komplett
 * fehlte. Reagiert nur, wenn man tatsaechlich ganz oben startet, damit es
 * normales Scrollen innerhalb der Seite nicht stoert.
 */
export default function PullToRefresh({ onRefresh, children }: { onRefresh: () => void; children: React.ReactNode }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const dragging = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (window.scrollY > 0 || refreshing) return;
    dragging.current = true;
    startY.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = e.clientY - startY.current;
    if (dy <= 0) { setPull(0); return; }
    // Gedaempft statt 1:1, wie ein Gummiband - fuehlt sich natuerlicher an
    // als eine starre Grenze.
    setPull(Math.min(dy * 0.5, MAX_PULL));
  };

  const handlePointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (pull >= TRIGGER_DISTANCE) {
      hapticTap();
      setRefreshing(true);
      setPull(TRIGGER_DISTANCE);
      onRefresh();
      setTimeout(() => { setRefreshing(false); setPull(0); }, 900);
    } else {
      setPull(0);
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: pull,
          transition: dragging.current ? 'none' : 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <RefreshCw
          size={18}
          className={refreshing ? 'animate-spin' : ''}
          style={{
            color: 'var(--app-gold)',
            opacity: Math.min(pull / TRIGGER_DISTANCE, 1),
            transform: refreshing ? undefined : `rotate(${pull * 3}deg)`,
          }}
        />
      </div>
      {/* eigener Flex-Container fuer die Karten, getrennt vom Pull-
          Indikator oben - sonst wuerde dessen eigener gap-5-Abstand auch
          dann einen Luecke erzeugen, wenn der Indikator eingeklappt
          (height: 0) ist. */}
      <div className="flex flex-col gap-5">
        {children}
      </div>
    </div>
  );
}
