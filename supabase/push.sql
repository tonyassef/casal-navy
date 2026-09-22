-- Casal Navy: push_subscriptions
-- Guarda a inscricao Web Push de cada aparelho do usuario.
-- Quando um recado chega em couple_notes, a Edge Function send-push
-- usa essas inscricoes pra mandar a notificacao.
create table if not exists push_subscriptions (
  user_id uuid primary key references profiles(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "push own" on push_subscriptions;
create policy "push own" on push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists push_subscriptions_endpoint_idx on push_subscriptions (endpoint);
