-- Bibliothèque : résumés (série et tome). À lancer une fois dans Supabase → SQL Editor → Run.
alter table public.lib_series  add column if not exists summary text;
alter table public.lib_volumes add column if not exists summary text;
