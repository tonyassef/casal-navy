-- ============================================================
-- Casal Navy — mídia nos recados (v50)
-- Como usar: cole este arquivo no SQL Editor do Supabase e rode.
--
-- Cria o bucket privado "recado-media" (fotos/vídeos dos recadinhos),
-- adiciona as colunas de mídia em couple_notes e cria as políticas:
-- cada usuário lê a própria mídia + a do par (igual v47/v49).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('recado-media', 'recado-media', false)
on conflict (id) do nothing;

alter table couple_notes
  add column if not exists media_path text not null default '';
alter table couple_notes
  add column if not exists media_type text not null default '';

drop policy if exists "recado media read" on storage.objects;
create policy "recado media read" on storage.objects
  for select using (
    bucket_id = 'recado-media' and (
      auth.uid() = owner
      or exists (
        select 1 from couple_pairs p
        where p.user_id = auth.uid() and p.partner_id = owner
      )
    )
  );

drop policy if exists "recado media upload" on storage.objects;
create policy "recado media upload" on storage.objects
  for insert with check (
    bucket_id = 'recado-media' and auth.uid() = owner
  );

drop policy if exists "recado media delete" on storage.objects;
create policy "recado media delete" on storage.objects
  for delete using (
    bucket_id = 'recado-media' and auth.uid() = owner
  );
