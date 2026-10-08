-- Kurt Giderek Azalıyor — Supabase şeması
-- Supabase panelinde: SQL Editor → New query → bu dosyanın tamamını yapıştır → Run.
-- Dosya tekrar çalıştırılabilir (idempotent).

-- ─────────────────────────────────────────────────────────────
-- Yönetici (sadece sen yazabilirsin)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────
-- Ayarlar (tek satır)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  display_name text not null default 'Kurt',
  daily_kcal_goal int not null default 2000,
  start_weight numeric(5, 2),
  target_weight numeric(5, 2),
  start_date date,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Ürünler: barkod önbelleği + kendi eklediğin ürünler + temel besinler
-- Tüm besin değerleri 100 g (veya 100 ml) içindir.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.products (
  id bigint generated always as identity primary key,
  barcode text unique,
  name text not null,
  brand text,
  kcal_100g numeric not null,
  protein_100g numeric,
  carbs_100g numeric,
  fat_100g numeric,
  sugar_100g numeric,
  fiber_100g numeric,
  salt_100g numeric,
  serving_g numeric,
  image_url text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists products_name_idx on public.products using gin (to_tsvector('simple', name));

-- ─────────────────────────────────────────────────────────────
-- Yenilenler
-- ─────────────────────────────────────────────────────────────
create table if not exists public.food_logs (
  id bigint generated always as identity primary key,
  log_date date not null,
  meal text not null check (meal in ('kahvalti', 'ogle', 'aksam', 'ara')),
  eaten_at timestamptz not null default now(),
  product_id bigint references public.products (id) on delete set null,
  name text not null,
  brand text,
  grams numeric,
  kcal numeric not null,
  protein numeric,
  carbs numeric,
  fat numeric,
  image_url text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists food_logs_date_idx on public.food_logs (log_date);

-- ─────────────────────────────────────────────────────────────
-- Health Connect'ten gelen günlük aktivite
-- ─────────────────────────────────────────────────────────────
create table if not exists public.daily_activity (
  log_date date primary key,
  active_kcal numeric,
  total_kcal numeric,
  steps int,
  distance_m numeric,
  source text not null default 'health-connect',
  synced_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Kilo (gün başına bir kayıt)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.weights (
  log_date date primary key,
  kg numeric(5, 2) not null check (kg > 20 and kg < 400),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Günlük özet görünümü
-- ─────────────────────────────────────────────────────────────
create or replace view public.daily_summary
with (security_invoker = true)
as
select
  d.log_date,
  coalesce(f.kcal_in, 0) as kcal_in,
  coalesce(f.protein, 0) as protein,
  coalesce(f.carbs, 0) as carbs,
  coalesce(f.fat, 0) as fat,
  coalesce(f.items, 0) as items,
  a.active_kcal,
  a.total_kcal,
  a.steps,
  w.kg
from (
  select log_date from public.food_logs
  union
  select log_date from public.daily_activity
  union
  select log_date from public.weights
) d
left join (
  select log_date,
         sum(kcal) as kcal_in,
         sum(protein) as protein,
         sum(carbs) as carbs,
         sum(fat) as fat,
         count(*) as items
  from public.food_logs
  group by log_date
) f using (log_date)
left join public.daily_activity a using (log_date)
left join public.weights w using (log_date);

-- ─────────────────────────────────────────────────────────────
-- Yetkiler: herkes okur, sadece admin yazar
-- ─────────────────────────────────────────────────────────────
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.food_logs enable row level security;
alter table public.daily_activity enable row level security;
alter table public.weights enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.settings, public.products, public.food_logs,
  public.daily_activity, public.weights, public.daily_summary to anon, authenticated;
grant insert, update, delete on public.settings, public.products, public.food_logs,
  public.daily_activity, public.weights to authenticated;
grant select on public.admins to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
declare t text;
begin
  foreach t in array array['settings', 'products', 'food_logs', 'daily_activity', 'weights'] loop
    execute format('drop policy if exists "herkes okur" on public.%I', t);
    execute format('create policy "herkes okur" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin yazar" on public.%I', t);
    execute format(
      'create policy "admin yazar" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "kendini gorur" on public.admins;
create policy "kendini gorur" on public.admins for select to authenticated using (user_id = auth.uid());
