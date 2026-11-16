-- Bibliothèque : résumés (série et tome). À lancer une fois dans Supabase → SQL Editor → Run.
alter table public.lib_series  add column if not exists summary text;
alter table public.lib_volumes add column if not exists summary text;
-- « À lire prochainement » : priorité 1, 2 ou 3 (vide = non)
alter table public.lib_series  add column if not exists next_prio int check (next_prio between 1 and 3);
