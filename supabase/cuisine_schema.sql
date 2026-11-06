-- ===== Espace Cuisine : tables =====
create table if not exists cuisine_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  to_buy boolean not null default false,
  rayons text[] not null default '{}',
  kind text not null default 'Alimentation',
  price text,
  ranking text,
  who text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists cuisine_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'recipe',          -- 'recipe' = Recettes, 'next' = Next recettes
  links text[] not null default '{}',           -- YouTube, Insta, X, sites…
  images text[] not null default '{}',          -- photos envoyées sur Cloudflare
  origin text,
  types text[] not null default '{}',           -- Plat, Entrée, Dessert…
  tags text[] not null default '{}',            -- Dinner, Lunch, Snack…
  minutes int,
  importance text,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists cuisine_recipe_items (
  recipe_id uuid not null references cuisine_recipes(id) on delete cascade,
  product_id uuid not null references cuisine_products(id) on delete cascade,
  primary key (recipe_id, product_id)
);
alter table cuisine_products enable row level security;
alter table cuisine_recipes enable row level security;
alter table cuisine_recipe_items enable row level security;
drop policy if exists "cuisine_products_auth" on cuisine_products;
drop policy if exists "cuisine_recipes_auth" on cuisine_recipes;
drop policy if exists "cuisine_recipe_items_auth" on cuisine_recipe_items;
create policy "cuisine_products_auth" on cuisine_products for all to authenticated using (true) with check (true);
create policy "cuisine_recipes_auth" on cuisine_recipes for all to authenticated using (true) with check (true);
create policy "cuisine_recipe_items_auth" on cuisine_recipe_items for all to authenticated using (true) with check (true);
