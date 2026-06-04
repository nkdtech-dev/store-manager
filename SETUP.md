# Store Manager — Setup Guide

## 1. Create Supabase Project

1. Go to https://supabase.com and create a free account
2. Click **New Project**, give it a name (e.g. "store-manager"), set a database password
3. Wait for the project to be ready (~2 min)

## 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-schema.sql` and paste it
3. Click **Run** — this creates all tables, policies, and storage bucket

## 3. Add Your Supabase Keys

1. In Supabase, go to **Project Settings → API**
2. Copy **Project URL** and **anon / public key**
3. Open `.env.local` in this folder and replace the placeholder values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## 4. Create the First Admin User

1. In Supabase dashboard, go to **Authentication → Users**
2. Click **Add User** → enter email + password
3. After creating, go to **Table Editor → profiles**
4. Find the user row and change `role` from `cashier` to `admin`

## 5. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and log in.

## 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add the two environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Features

| Page | What it does |
|------|-------------|
| **Dashboard** | Overview cards + scrollable product grid, click any product to see popup |
| **Inventory** | Add/edit/delete products with photos, codes, prices, stock levels |
| **Sales** | Search by code/name → add to cart → confirm sale → stock auto-decrements |
| **Analytics** | Revenue charts, top products, category breakdown, date range filters |

## Currency
All prices are in **FCFA** (CFA franc). Change the label in the components if needed.

## Adding More Staff
Admin users can create cashier accounts via Supabase Authentication → Add User (leave role as `cashier`).
