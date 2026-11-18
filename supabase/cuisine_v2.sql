-- =====================================================================
-- Cuisine v2 : couverture, description et quantités des ingrédients.
-- À lancer une fois dans Supabase → SQL Editor → Run. Sans danger si relancé.
-- Schéma seulement, aucune donnée.
-- =====================================================================
alter table public.cuisine_recipes      add column if not exists cover_url   text;  -- couverture (image Insta / YouTube copiée dans le stockage)
alter table public.cuisine_recipes      add column if not exists description text;  -- description d'origine (légende Instagram…)
alter table public.cuisine_recipe_items add column if not exists qty         text;  -- quantité : « 300 g », « 2 c. à s. »…
alter table public.cuisine_recipes      add column if not exists media       jsonb not null default '{}'::jsonb;  -- vignette de chaque lien { url: image }

select 'cuisine_recipes' as t, count(*) from public.cuisine_recipes;
