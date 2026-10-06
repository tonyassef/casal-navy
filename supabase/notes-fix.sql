-- ============================================================
-- Casal Navy — correção dos recados (v49)
-- Como usar: cole este arquivo no SQL Editor do Supabase e rode.
--
-- O PROBLEMA: o campo "Para quem" usa apelidos ("Antonio"/"Eliza"),
-- mas os perfis têm nome completo ("Tony Assef"/"Elizama Aguilar").
-- A política antiga exigia igualdade EXATA do nome para leitura, e o
-- push fazia match por prefixo — resultado: os recados da Eliza nunca
-- chegavam no Tony (nem push, nem na aba Recados).
--
-- A CORREÇÃO: leitura e push passam a usar o pareamento (couple_pairs),
-- igual ao isolamento da v47. Cada usuário lê os próprios recados +
-- os do par. Os recados já enviados aparecem sozinhos, sem migração.
-- ============================================================

drop policy if exists "couple select" on couple_notes;
create policy "couple select" on couple_notes
  for select using (
    auth.uid() = from_user_id
    or exists (
      select 1 from couple_pairs p
      where p.user_id = auth.uid() and p.partner_id = couple_notes.from_user_id
    )
  );
