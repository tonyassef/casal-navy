-- ============================================================
-- Casal Navy — schema do banco (Supabase / Postgres)
-- Como usar: crie um projeto gratis em https://supabase.com
-- depois cole este arquivo no SQL Editor do Supabase e rode.
-- ============================================================

-- Perfil de cada usuario (1 linha por conta)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  meta jsonb not null default '{}'::jsonb,   -- ex: {"rotation_index": 0}
  created_at timestamptz not null default now()
);

-- Plano de treino ativo de cada usuario (editavel no app a cada 3 meses)
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null default 'Meu plano',
  days jsonb not null default '[]'::jsonb,    -- [{day, muscle, exercises:[{nameA,nameB,sets,reps,technique,rest}]}]
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(user_id, active)
);

-- Historico de treinos concluidos
create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  log_date date not null,
  day_label text not null default '',        -- ex: "Dia A — Costas/Biceps"
  entries jsonb not null default '[]'::jsonb,-- [{name, variant, sets, reps, technique, weight, doneSets, notes}]
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists workout_logs_user_date_idx on workout_logs(user_id, log_date desc);

-- ---------- seguranca: cada usuario so enxerga os proprios dados ----------
alter table profiles enable row level security;
alter table plans enable row level security;
alter table workout_logs enable row level security;

drop policy if exists "owner profiles" on profiles;
create policy "owner profiles" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "owner plans" on plans;
create policy "owner plans" on plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner logs" on workout_logs;
create policy "owner logs" on workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- recadinhos do casal: um escreve, o outro le ----------
create table if not exists couple_notes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references profiles(id) on delete cascade,
  from_name text not null default '',
  to_name text not null default '',
  message text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists couple_notes_to_idx on couple_notes(to_name, created_at desc);

alter table couple_notes enable row level security;

drop policy if exists "couple insert" on couple_notes;
create policy "couple insert" on couple_notes
  for insert with check (auth.uid() = from_user_id);

drop policy if exists "couple select" on couple_notes;
create policy "couple select" on couple_notes
  for select using (
    auth.uid() = from_user_id
    or lower(to_name) = lower((select name from profiles where id = auth.uid()))
  );

drop policy if exists "couple delete" on couple_notes;
create policy "couple delete" on couple_notes
  for delete using (auth.uid() = from_user_id);
