-- ============================================================
-- Casal Navy — Duelo do casal (resumos de treino)
-- Como usar: cole este arquivo no SQL Editor do Supabase e rode.
-- Um resumo por usuário/data; leitura liberada para o casal.
-- ============================================================

create table if not exists workout_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  user_name text not null default '',
  log_date date not null,
  day_label text not null default '',
  volume_lbs integer not null default 0,
  duration_min integer not null default 0,
  exercises_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);
create index if not exists workout_summaries_date_idx on workout_summaries(log_date desc);

alter table workout_summaries enable row level security;

drop policy if exists "summary read couple" on workout_summaries;
create policy "summary read couple" on workout_summaries
  for select using (auth.role() = 'authenticated');

drop policy if exists "summary insert own" on workout_summaries;
create policy "summary insert own" on workout_summaries
  for insert with check (auth.uid() = user_id);

drop policy if exists "summary update own" on workout_summaries;
create policy "summary update own" on workout_summaries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
