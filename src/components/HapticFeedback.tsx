'use client';

import { useEffect } from 'react';
import { hapticTap } from '@/lib/haptics';

/**
 * Loest bei jedem Antippen eines Buttons ein kurzes haptisches Feedback
 * aus - global per Capture-Listener am Dokument, statt die weit über 90
 * Button-Stellen im Code einzeln anzufassen. pointerdown statt click,
 * damit die Rückmeldung so unmittelbar wie beim Antippen selbst kommt,
 * nicht erst nach Abschluss der Tippgeste. Im Browser ist hapticTap() ein
 * no-op (siehe lib/haptics.ts), die Komponente kann also gefahrlos auch
 * auf der Web-Version mitgerendert werden.
 */
export default function HapticFeedback() {
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest('button, [role="button"]');
      if (interactive && !interactive.hasAttribute('disabled')) {
        hapticTap();
      }
    };
    document.addEventListener('pointerdown', handler, { capture: true });
    return () => document.removeEventListener('pointerdown', handler, { capture: true });
  }, []);

  return null;
}
