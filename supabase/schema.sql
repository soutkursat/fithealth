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
alter table public.settings add column if not exists status_message text;
alter table public.settings add column if not exists show_notes boolean not null default true;
alter table public.settings add column if not exists water_goal_ml int not null default 2500;
alter table public.settings add column if not exists protein_goal_g int not null default 120;

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
-- Eski kurulumlar için: sonradan eklenen kolonlar
alter table public.daily_activity add column if not exists total_estimated boolean not null default false;
alter table public.daily_activity add column if not exists sources text[];

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
-- Elle girilen yakılan kalori. Telefondan gelen veriye (daily_activity)
-- hiç dokunmaz; özet görünümünde ayrı kolonlar olarak gelir.
-- ─────────────────────────────────────────────────────────────
-- Ek aktivite: telefonun görmediği egzersiz vb. Gün toplamına eklenir.
create table if not exists public.manual_burns (
  id bigint generated always as identity primary key,
  log_date date not null,
  kcal numeric not null check (kcal > 0 and kcal < 10000),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists manual_burns_date_idx on public.manual_burns (log_date);

-- Gün toplamı: sadece telefondan gerçek veri gelmediği günlerde kullanılır.
create table if not exists public.manual_day_totals (
  log_date date primary key,
  total_kcal numeric not null check (total_kcal > 0 and total_kcal < 15000),
  note text,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Su (her kayıt bir bardak/şişe)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.water_logs (
  id bigint generated always as identity primary key,
  log_date date not null,
  ml int not null check (ml > 0 and ml <= 5000),
  created_at timestamptz not null default now()
);
create index if not exists water_logs_date_idx on public.water_logs (log_date);

-- ─────────────────────────────────────────────────────────────
-- Ziyaretçi notları ve motivasyon tıklamaları (üyeliksiz)
-- Yazma sadece sunucu üzerinden (/api/notes, /api/motivate) yapılır.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notes (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 40),
  message text not null check (char_length(message) between 1 and 500),
  hidden boolean not null default false,
  read_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists notes_created_idx on public.notes (created_at desc);

create table if not exists public.motivations (
  id bigint generated always as identity primary key,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists motivations_created_idx on public.motivations (created_at desc);
create index if not exists motivations_ip_idx on public.motivations (ip_hash, created_at desc);

-- Herkese açık sayaç (satırların kendisi gizli kalır)
create or replace function public.motivation_counts()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'today', count(*) filter (
      where created_at >= (date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul')
    ),
    'total', count(*)
  )
  from public.motivations;
$$;

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
  w.kg,
  coalesce(a.total_estimated, false) as total_estimated,
  mt.total_kcal as manual_total_kcal,
  mb.kcal as extra_kcal,
  coalesce(wl.ml, 0) as water_ml
from (
  select log_date from public.food_logs
  union
  select log_date from public.daily_activity
  union
  select log_date from public.weights
  union
  select log_date from public.manual_burns
  union
  select log_date from public.manual_day_totals
  union
  select log_date from public.water_logs
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
left join public.weights w using (log_date)
left join public.manual_day_totals mt using (log_date)
left join (
  select log_date, sum(kcal) as kcal from public.manual_burns group by log_date
) mb using (log_date)
left join (
  select log_date, sum(ml) as ml from public.water_logs group by log_date
) wl using (log_date);

-- ─────────────────────────────────────────────────────────────
-- Yetkiler: herkes okur, sadece admin yazar
-- ─────────────────────────────────────────────────────────────
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.food_logs enable row level security;
alter table public.daily_activity enable row level security;
alter table public.weights enable row level security;
alter table public.manual_burns enable row level security;
alter table public.manual_day_totals enable row level security;
alter table public.water_logs enable row level security;
alter table public.notes enable row level security;
alter table public.motivations enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.settings, public.products, public.food_logs,
  public.daily_activity, public.weights, public.daily_summary to anon, authenticated;
grant insert, update, delete on public.settings, public.products, public.food_logs,
  public.daily_activity, public.weights to authenticated;
grant select on public.admins to authenticated;
grant select on public.manual_burns, public.manual_day_totals, public.water_logs to anon, authenticated;
grant insert, update, delete on public.manual_burns, public.manual_day_totals, public.water_logs to authenticated;
-- Notlar: ziyaretçiler ip_hash kolonunu göremez
grant select (id, name, message, hidden, created_at) on public.notes to anon;
grant select, update, delete on public.notes to authenticated;
grant select, delete on public.motivations to authenticated;
grant execute on function public.motivation_counts() to anon, authenticated, service_role;
-- Sunucu (service_role) tüm tablolara yazabilmeli; bazı yeni projelerde bu izin otomatik gelmiyor.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated;

do $$
declare t text;
begin
  foreach t in array array['settings', 'products', 'food_logs', 'daily_activity', 'weights', 'manual_burns', 'manual_day_totals', 'water_logs'] loop
    execute format('drop policy if exists "herkes okur" on public.%I', t);
    execute format('create policy "herkes okur" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin yazar" on public.%I', t);
    execute format(
      'create policy "admin yazar" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "kendini gorur" on public.admins;
create policy "kendini gorur" on public.admins for select to authenticated using (user_id = auth.uid());

drop policy if exists "gorunur notlar" on public.notes;
create policy "gorunur notlar" on public.notes for select to anon using (hidden = false);
drop policy if exists "admin notlar" on public.notes;
create policy "admin notlar" on public.notes for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin motivasyon" on public.motivations;
create policy "admin motivasyon" on public.motivations for all to authenticated using (public.is_admin()) with check (public.is_admin());
