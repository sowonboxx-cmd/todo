-- =====================================================================
-- Espace Bibliothèque : séries, tomes, prépublication.
-- À lancer une fois dans Supabase → SQL Editor → Run.
-- Sans danger si relancé (if not exists). Schéma seulement, aucune donnée.
-- =====================================================================

create table if not exists public.lib_series (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  title_original text,
  kind           text not null default 'manga',   -- manga | bd | comics | magazine | livre
  authors        text,                            -- scénario (ou auteur unique)
  artist         text,                            -- dessin, si différent
  publisher      text,
  edition        text,                            -- ex. « Kodansha (JP) · Pika (FR) »
  genre          text,
  status         text,                            -- En cours, Terminé…
  total_volumes  int,
  cover_url      text,
  source_url     text,                            -- lien BDGest, Amazon…
  format         text not null default 'paper',   -- paper | digital (format par défaut des tomes)
  top            text,                            -- indispensable | prefere | null
  rating         int check (rating between 1 and 10),
  follow         boolean not null default true,   -- suivre les sorties / tomes manquants
  notes          text,
  is_archived    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.lib_volumes (
  id           uuid primary key default gen_random_uuid(),
  series_id    uuid not null references public.lib_series(id) on delete cascade,
  number       numeric not null,                  -- numeric pour les tomes 10.5, hors-série…
  title        text,
  isbn         text,
  release_date date,
  cover_url    text,
  owned        boolean not null default false,
  format       text,                              -- paper | digital (vide = celui de la série)
  bought_at    date,
  read         boolean not null default false,
  read_at      date,
  signed       boolean not null default false,    -- dédicacé
  rating       int check (rating between 1 and 10),
  wish         boolean not null default false,    -- dans « À acheter »
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists lib_volumes_series_idx on public.lib_volumes(series_id, number);
create index if not exists lib_volumes_release_idx on public.lib_volumes(release_date);

create table if not exists public.lib_prepub (
  id           uuid primary key default gen_random_uuid(),
  magazine     text,
  series_id    uuid references public.lib_series(id) on delete set null,
  series_title text,
  chapter      text,
  issue_date   date,
  read         boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- accès : mêmes règles que le reste de l'app (utilisateur connecté)
alter table public.lib_series  enable row level security;
alter table public.lib_volumes enable row level security;
alter table public.lib_prepub  enable row level security;
drop policy if exists "lib_series_auth_all"  on public.lib_series;
drop policy if exists "lib_volumes_auth_all" on public.lib_volumes;
drop policy if exists "lib_prepub_auth_all"  on public.lib_prepub;
create policy "lib_series_auth_all"  on public.lib_series  for all to authenticated using (true) with check (true);
create policy "lib_volumes_auth_all" on public.lib_volumes for all to authenticated using (true) with check (true);
create policy "lib_prepub_auth_all"  on public.lib_prepub  for all to authenticated using (true) with check (true);

-- vérification
select 'lib_series' as table_name, count(*) from public.lib_series
union all select 'lib_volumes', count(*) from public.lib_volumes
union all select 'lib_prepub', count(*) from public.lib_prepub;
