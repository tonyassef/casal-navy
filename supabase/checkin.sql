-- ============================================================
-- Casal Navy — check-in na academia + respostas e curtidas nos recados
-- Como usar: cole este arquivo no SQL Editor do Supabase e rode.
-- (Depois de rodar, crie o webhook "checkin-push": Database -> Webhooks,
--  tabela gym_checkins, evento INSERT, POST para
--  https://<ref>.supabase.co/functions/v1/send-push)
-- ============================================================

-- ---------- check-ins na academia ----------
-- type: 'in' (chegada) ou 'out' (saída); cada evento é uma linha
create table if not exists gym_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  user_name text not null default '',
  type text not null default 'in',
  created_at timestamptz not null default now()
);
create index if not exists gym_checkins_user_time_idx on gym_checkins(user_id, created_at desc);

alter table gym_checkins enable row level security;

drop policy if exists "checkin read couple" on gym_checkins;
create policy "checkin read couple" on gym_checkins
  for select using (auth.role() = 'authenticated');

drop policy if exists "checkin insert own" on gym_checkins;
create policy "checkin insert own" on gym_checkins
  for insert with check (auth.uid() = user_id);

-- ---------- respostas nos recadinhos (parent_id = recado original) ----------
alter table couple_notes
  add column if not exists parent_id uuid references couple_notes(id) on delete cascade;
create index if not exists couple_notes_parent_idx on couple_notes(parent_id, created_at);

-- ---------- curtidas com emoji nos recadinhos ----------
create table if not exists note_reactions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references couple_notes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  user_name text not null default '',
  emoji text not null default '❤️',
  created_at timestamptz not null default now(),
  unique(note_id, user_id, emoji)
);
create index if not exists note_reactions_note_idx on note_reactions(note_id);

alter table note_reactions enable row level security;

drop policy if exists "reaction read couple" on note_reactions;
create policy "reaction read couple" on note_reactions
  for select using (auth.role() = 'authenticated');

drop policy if exists "reaction insert own" on note_reactions;
create policy "reaction insert own" on note_reactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "reaction delete own" on note_reactions;
create policy "reaction delete own" on note_reactions
  for delete using (auth.uid() = user_id);
