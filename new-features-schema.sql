-- Stock movements log (receiving stock, writeoffs, adjustments)
create table if not exists public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade,
  type text not null check (type in ('received', 'sold', 'adjustment', 'writeoff')),
  quantity integer not null,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.stock_movements enable row level security;
create policy "auth read" on public.stock_movements for select using (auth.uid() is not null);
create policy "auth insert" on public.stock_movements for insert with check (auth.uid() is not null);

-- Expenses tracking
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  description text not null,
  amount numeric(12,2) not null,
  category text not null default 'General',
  recorded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.expenses enable row level security;
create policy "auth read" on public.expenses for select using (auth.uid() is not null);
create policy "auth insert" on public.expenses for insert with check (auth.uid() is not null);
create policy "auth delete" on public.expenses for delete using (auth.uid() is not null);

-- Add discount column to sales
alter table public.sales add column if not exists discount numeric(12,2) default 0;
-- Add discount to sale_items
alter table public.sale_items add column if not exists discount numeric(12,2) default 0;
