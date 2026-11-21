-- Native Push-Token (FCM) fuer die iOS/Android-App ueber Capacitor
--
-- Web Push (bestehende push_subscriptions-Tabelle: endpoint/p256dh/auth)
-- funktioniert nicht zuverlaessig in der nativen WebView der Capacitor-App.
-- Die native App registriert sich stattdessen ueber Firebase Cloud
-- Messaging - dort gibt es nur einen einzelnen Token-String statt der drei
-- Web-Push-Felder, daher eine eigene Tabelle statt Wiederverwendung von
-- push_subscriptions.
--
-- Gleiche RLS-Konvention wie push_subscriptions: angemeldete Nutzer duerfen
-- alle Zeilen lesen (fuer die Admin-Zusammenfuehrung beim Versand nicht
-- noetig, aber konsistent mit dem bestehenden Muster), aber nur das eigene
-- Token schreiben/loeschen.

create table if not exists public.native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  token text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists native_push_tokens_user_id_idx on public.native_push_tokens(user_id);

alter table public.native_push_tokens enable row level security;

create policy "Jeder darf native Token lesen" on public.native_push_tokens
  for select to authenticated using (true);

create policy "User verwaltet eigenes natives Token" on public.native_push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
