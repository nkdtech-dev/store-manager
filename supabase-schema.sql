-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null default 'cashier' check (role in ('admin', 'cashier')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Admins can manage profiles" on public.profiles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'User'), coalesce(new.raw_user_meta_data->>'role', 'cashier'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Categories
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  created_at timestamptz default now()
);
alter table public.categories enable row level security;
create policy "Authenticated can view categories" on public.categories for select using (auth.role() = 'authenticated');
create policy "Admins can manage categories" on public.categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Insert default categories
insert into public.categories (name) values
  ('Electronics'), ('Plumbing'), ('Building Materials'),
  ('Household'), ('Mechanical & Welding'), ('Other');

-- Products
create table public.products (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  name text not null,
  description text,
  category_id uuid references public.categories(id),
  image_url text,
  cost_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  stock_quantity integer not null default 0,
  min_stock_level integer not null default 5,
  unit text not null default 'pcs',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.products enable row level security;
create policy "Authenticated can view products" on public.products for select using (auth.role() = 'authenticated');
create policy "Admins can manage products" on public.products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Cashiers can update stock" on public.products for update using (auth.role() = 'authenticated');

-- Auto-update updated_at
create or replace function update_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger products_updated_at before update on public.products for each row execute procedure update_updated_at();

-- Sales
create table public.sales (
  id uuid default gen_random_uuid() primary key,
  receipt_number text not null unique,
  cashier_id uuid references public.profiles(id),
  total_amount numeric(12,2) not null default 0,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'card', 'transfer')),
  notes text,
  created_at timestamptz default now()
);
alter table public.sales enable row level security;
create policy "Authenticated can view sales" on public.sales for select using (auth.role() = 'authenticated');
create policy "Authenticated can insert sales" on public.sales for insert with check (auth.role() = 'authenticated');
create policy "Admins can manage sales" on public.sales for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Sale Items
create table public.sale_items (
  id uuid default gen_random_uuid() primary key,
  sale_id uuid references public.sales(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity integer not null,
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  created_at timestamptz default now()
);
alter table public.sale_items enable row level security;
create policy "Authenticated can view sale items" on public.sale_items for select using (auth.role() = 'authenticated');
create policy "Authenticated can insert sale items" on public.sale_items for insert with check (auth.role() = 'authenticated');

-- Storage bucket for product images
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);
create policy "Public can view product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "Authenticated can upload product images" on storage.objects for insert with check (
  bucket_id = 'product-images' and auth.role() = 'authenticated'
);
create policy "Authenticated can update product images" on storage.objects for update using (
  bucket_id = 'product-images' and auth.role() = 'authenticated'
);
