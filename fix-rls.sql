-- ============================================
-- FIX 1: Update RLS policies to work reliably
-- ============================================

-- Categories: allow all authenticated users to read
drop policy if exists "Authenticated can view categories" on public.categories;
create policy "Authenticated can view categories" on public.categories
  for select using (auth.uid() is not null);

-- Products: allow all authenticated users to read
drop policy if exists "Authenticated can view products" on public.products;
create policy "Authenticated can view products" on public.products
  for select using (auth.uid() is not null);

-- Profiles: allow all authenticated users to read all profiles
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles
  for select using (auth.uid() is not null);

-- Sales: allow all authenticated users to read
drop policy if exists "Authenticated can view sales" on public.sales;
create policy "Authenticated can view sales" on public.sales
  for select using (auth.uid() is not null);

-- Sale items: allow all authenticated users to read
drop policy if exists "Authenticated can view sale items" on public.sale_items;
create policy "Authenticated can view sale items" on public.sale_items
  for select using (auth.uid() is not null);

-- ============================================
-- FIX 2: Create missing profiles for existing users
-- (for users added manually in Supabase Auth)
-- ============================================
insert into public.profiles (id, email, full_name, role)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  coalesce(au.raw_user_meta_data->>'role', 'cashier')
from auth.users au
where not exists (
  select 1 from public.profiles p where p.id = au.id
)
on conflict (id) do nothing;

-- ============================================
-- FIX 3: Show current state (to verify)
-- ============================================
select id, email, full_name, role from public.profiles;
select id, name from public.categories;
