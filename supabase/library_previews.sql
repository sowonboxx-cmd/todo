-- Bibliothèque : planches (aperçus) des tomes. À lancer une fois dans Supabase → SQL Editor → Run.
-- Les images sont rangées dans le stockage Supabase, dossier « bibliotheque ».
alter table public.lib_volumes add column if not exists previews jsonb;

insert into storage.buckets (id, name, public)
values ('bibliotheque', 'bibliotheque', true)
on conflict (id) do nothing;

-- vous (connecté) : ajouter / remplacer / retirer des images dans ce dossier
drop policy if exists "bibliotheque_auth_write" on storage.objects;
create policy "bibliotheque_auth_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'bibliotheque') with check (bucket_id = 'bibliotheque');
