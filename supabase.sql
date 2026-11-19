create table if not exists public.saha_rooms (
  room_code text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- The browser never accesses this table directly. Only the Vercel API
-- uses the Supabase service-role key, which bypasses RLS.
alter table public.saha_rooms enable row level security;
