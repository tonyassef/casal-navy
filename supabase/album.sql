-- ============================================================
-- KORPUS / Casal Navy — álbum compartilhado do casal (v1)
-- Como usar: cole este arquivo no SQL Editor do Supabase e rode.
--
-- Cria a tabela album_photos (metadados das fotos do álbum).
-- Os arquivos ficam no bucket privado "recado-media" já existente,
-- no prefixo album/<user_id>/ — a política de leitura do bucket já
-- permite o par ver (igual à mídia dos recados), sem mudança lá.
-- ============================================================

create table if not exists album_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists album_photos_user_idx on album_photos(user_id, created_at desc);

alter table album_photos enable row level security;

drop policy if exists "album insert" on album_photos;
create policy "album insert" on album_photos
  for insert with check (auth.uid() = user_id);

drop policy if exists "album select" on album_photos;
create policy "album select" on album_photos
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from couple_pairs p
      where p.user_id = auth.uid() and p.partner_id = album_photos.user_id
    )
  );

drop policy if exists "album delete" on album_photos;
create policy "album delete" on album_photos
  for delete using (auth.uid() = user_id);
