import type { CSSProperties } from 'react';

/* Eigenes, markeneigenes Icon statt eines generischen Lucide-Icons - kein
   Lucide-Symbol trifft "Moschee/Gebet" gut genug. Gleicher Stroke-Stil wie
   Lucide (24er Viewbox, runde Linien) fuer visuelle Konsistenz mit den
   uebrigen vier Tab-Icons. */
export default function NamazIcon({
  size = 20,
  strokeWidth = 1.7,
  style,
}: {
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M12 2v2.2" />
      <circle cx="12" cy="1.4" r="0.6" fill="currentColor" stroke="none" />
      <path d="M7 11c0-3 2.2-5.2 5-5.2s5 2.2 5 5.2" />
      <path d="M4.5 11h15" />
      <path d="M6 11v7.5a1 1 0 0 0 1 1h2v-4a3 3 0 0 1 6 0v4h2a1 1 0 0 0 1-1V11" />
      <path d="M3 19.5h18" />
    </svg>
  );
}
