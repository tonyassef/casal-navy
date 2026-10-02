-- ============================================================
-- Casal Navy — pareamento + isolamento ("modo amigo")
-- Como usar: cole este arquivo no SQL Editor do Supabase e rode.
-- O que faz:
--  1) cria a tabela couple_pairs (quem é par de quem);
--  2) emparelha os usuários já existentes (Tony e Eliza);
--  3) fecha a leitura de workout_summaries, gym_checkins e
--     note_reactions: cada um só lê o próprio + o do par.
--     (Antes, QUALQUER usuário logado lia tudo — um amigo novo
--     veria os treinos/check-ins do casal no Duelo.)
-- ============================================================

create table if not exists couple_pairs (
  user_id uuid primary key references profiles(id) on delete cascade,
  partner_id uuid not null references profiles(id) on delete cascade,
  partner_name text not null default '',
  created_at timestamptz not null default now()
);

alter table couple_pairs enable row level security;

drop policy if exists "pairs read all" on couple_pairs;
create policy "pairs read all" on couple_pairs
  for select using (auth.role() = 'authenticated');

drop policy if exists "pairs insert own" on couple_pairs;
create policy "pairs insert own" on couple_pairs
  for insert with check (auth.uid() = user_id);

drop policy if exists "pairs delete own" on couple_pairs;
create policy "pairs delete own" on couple_pairs
  for delete using (auth.uid() = user_id);

-- emparelha os usuários já existentes entre si (Tony <-> Eliza).
-- Só faz sentido se houver exatamente 2 perfis; com mais perfis,
-- confira antes com: select id, name from profiles;
insert into couple_pairs (user_id, partner_id, partner_name)
select a.id, b.id, b.name
from profiles a cross join profiles b
where a.id <> b.id
on conflict (user_id) do nothing;

-- ---------- leitura restrita ao par ----------
drop policy if exists "summary read couple" on workout_summaries;
create policy "summary read pair" on workout_summaries
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from couple_pairs p
      where p.user_id = auth.uid() and p.partner_id = workout_summaries.user_id
    )
  );

drop policy if exists "checkin read couple" on gym_checkins;
create policy "checkin read pair" on gym_checkins
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from couple_pairs p
      where p.user_id = auth.uid() and p.partner_id = gym_checkins.user_id
    )
  );

drop policy if exists "reaction read couple" on note_reactions;
create policy "reaction read pair" on note_reactions
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from couple_pairs p
      where p.user_id = auth.uid() and p.partner_id = note_reactions.user_id
    )
  );
