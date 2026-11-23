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
      <path d="M12 2.2v2.4" />
      <circle cx="12" cy="1.3" r="0.65" fill="currentColor" stroke="none" />
      <path d="M7 10a5 6.3 0 0 1 10 0" />
      <path d="M7 10v9" />
      <path d="M17 10v9" />
      <path d="M4 19.3h16" />
    </svg>
  );
}
