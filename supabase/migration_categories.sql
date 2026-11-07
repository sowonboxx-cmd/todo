-- =====================================================================
-- Catégories de tâches (par projet, partagées par toutes ses pages)
-- À lancer une fois dans Supabase → SQL Editor → Run.
-- Sans danger si relancé (if not exists / on conflict).
-- =====================================================================

create table if not exists public.task_categories (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  color       text,
  position    int  not null default 0,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists task_categories_project_idx on public.task_categories(project_id, position);

-- la catégorie d'une tâche (vide = « Sans catégorie ») ; supprimer une catégorie remet ses tâches à vide
alter table public.todos
  add column if not exists category_id uuid references public.task_categories(id) on delete set null;
create index if not exists todos_category_idx on public.todos(category_id);

-- accès : mêmes règles que le reste de l'app (utilisateur connecté)
alter table public.task_categories enable row level security;
drop policy if exists "task_categories_auth_all" on public.task_categories;
create policy "task_categories_auth_all" on public.task_categories
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Optionnel : les 7 catégories de Beltab (Drevici Oyster, Général…).
-- Ne crée rien si Beltab a déjà des catégories.
-- ---------------------------------------------------------------------
insert into public.task_categories (project_id, name, color, position)
select p.id, c.name, c.color, c.pos
from (select id from public.projects
      where name ilike 'beltab%' and coalesce(is_archived, false) = false
      order by position limit 1) p
cross join (values
  ('Site internet',        '#2F62C9', 1),
  ('Impression',           '#B4541A', 2),
  ('Réseaux sociaux',      '#B23A6E', 3),
  ('QR & jeux',            '#6A44B8', 4),
  ('Google',               '#237A45', 5),
  ('Offres & événements',  '#946200', 6),
  ('Admin & contrat',      '#4a4a4a', 7)
) as c(name, color, pos)
where not exists (select 1 from public.task_categories tc where tc.project_id = p.id);

-- vérification
select p.name as projet, tc.position, tc.name as categorie
from public.task_categories tc join public.projects p on p.id = tc.project_id
order by p.name, tc.position;
