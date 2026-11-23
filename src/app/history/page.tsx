import { redirect } from 'next/navigation';

// Zikr, Termine und Statistik sind auf /namaz, /events und /profile
// aufgeteilt (keine gemeinsame Tab-Leiste mehr) - dieser Redirect haelt
// alte Links/Lesezeichen am Leben.
export default function HistoryRedirect() {
  redirect('/namaz');
}
