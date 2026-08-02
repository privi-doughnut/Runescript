-- ============================================================================
-- Rune Script — Final Supabase schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Idempotent: safe to run multiple times (uses IF NOT EXISTS everywhere).
-- Unblocks: Creator Program applications, email sequence scheduler, creator
-- earnings backend.
-- ============================================================================

-- ── 1. Creator Program applications ────────────────────────────────────────
create table if not exists creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  email text not null,
  name text,
  tier text not null,               -- 'archon' | 'sovereign' | 'collab'
  platform text,
  handle text,
  followers text,
  why text,
  status text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table creator_applications enable row level security;

drop policy if exists "users insert own application" on creator_applications;
create policy "users insert own application" on creator_applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "users view own application" on creator_applications;
create policy "users view own application" on creator_applications
  for select using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') = 'prithivivijayakumar.work@gmail.com'
  );

drop policy if exists "owner updates applications" on creator_applications;
create policy "owner updates applications" on creator_applications
  for update using ((auth.jwt() ->> 'email') = 'prithivivijayakumar.work@gmail.com');

-- ── 2. Comp/creator flags on profiles ───────────────────────────────────────
-- comp_plan: owner-granted free plan access (e.g. approved creators). When
-- set, the app treats this as the user's effective plan, bypassing Stripe
-- billing entirely — see checkTrial() in App.jsx.
alter table profiles add column if not exists comp_plan text;
alter table profiles add column if not exists is_creator boolean not null default false;

-- ── 3. Email sequence scheduler ─────────────────────────────────────────────
create table if not exists email_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references email_sequences(id) on delete cascade not null,
  step_order int not null,
  delay_days int not null default 0,   -- days after enrollment to send this step
  subject text not null,
  body text not null
);

create table if not exists sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references email_sequences(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_email text not null,
  contact_name text,
  enrolled_at timestamptz not null default now(),
  status text not null default 'active'   -- 'active' | 'completed' | 'cancelled'
);

create table if not exists sequence_sends (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references sequence_enrollments(id) on delete cascade not null,
  step_id uuid references sequence_steps(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,  -- denormalized for simpler RLS
  send_at timestamptz not null,
  sent boolean not null default false,
  sent_at timestamptz
);

create index if not exists sequence_sends_due_idx on sequence_sends (send_at) where sent = false;

alter table email_sequences enable row level security;
alter table sequence_steps enable row level security;
alter table sequence_enrollments enable row level security;
alter table sequence_sends enable row level security;

drop policy if exists "users manage own sequences" on email_sequences;
create policy "users manage own sequences" on email_sequences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users manage own sequence steps" on sequence_steps;
create policy "users manage own sequence steps" on sequence_steps
  for all using (
    exists (select 1 from email_sequences s where s.id = sequence_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from email_sequences s where s.id = sequence_id and s.user_id = auth.uid())
  );

drop policy if exists "users manage own enrollments" on sequence_enrollments;
create policy "users manage own enrollments" on sequence_enrollments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users manage own sends" on sequence_sends;
create policy "users manage own sends" on sequence_sends
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The Cloudflare Worker's scheduled Cron Trigger sends due emails. It should
-- use a service_role key (bypasses RLS entirely) rather than the anon key,
-- since it needs to read/update sends across ALL users, not just one. Set
-- SUPABASE_SERVICE_ROLE_KEY as a Cloudflare secret if/when the cron sender
-- is wired up (see PROGRESS.md).

-- ── 4. Creator-submitted marketplace templates ──────────────────────────────
-- Previously "Submit a Template" only pushed to local component state — it
-- vanished on reload and no other user could ever see or buy it. This table
-- makes creator-submitted templates real and sellable, alongside the
-- built-in curated catalog (which has no real seller and pays out nothing).
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid references auth.users(id) on delete cascade not null,
  seller_name text,   -- denormalized at insert time, avoids a cross-table join just to show "by X"
  name text not null,
  category text not null,
  description text,
  price numeric(10,2) not null,
  html text,
  colors text[] default array['#c9a84c','#1a1a2e'],
  rating numeric(2,1) not null default 0,
  reviews int not null default 0,
  sales_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table templates enable row level security;

drop policy if exists "anyone can browse templates" on templates;
create policy "anyone can browse templates" on templates for select using (true);

drop policy if exists "sellers manage own templates" on templates;
create policy "sellers manage own templates" on templates
  for all using (auth.uid() = seller_user_id) with check (auth.uid() = seller_user_id);

-- ── 5. Creator earnings / template sales ────────────────────────────────────
create table if not exists template_sales (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  template_name text,
  seller_user_id uuid references auth.users(id),
  buyer_user_id uuid references auth.users(id),
  amount numeric(10,2) not null,
  creator_cut numeric(10,2) not null,     -- 70% of amount for creator-submitted templates, 0 for the built-in catalog (no real seller to pay)
  stripe_session_id text,
  payout_status text not null default 'pending',  -- 'pending' | 'manual_paid'
  created_at timestamptz not null default now()
);

alter table template_sales enable row level security;

drop policy if exists "sellers view own sales" on template_sales;
create policy "sellers view own sales" on template_sales
  for select using (
    auth.uid() = seller_user_id
    or auth.uid() = buyer_user_id
    or (auth.jwt() ->> 'email') = 'prithivivijayakumar.work@gmail.com'
  );

drop policy if exists "buyers record own purchase" on template_sales;
create policy "buyers record own purchase" on template_sales
  for insert with check (auth.uid() = buyer_user_id);

drop policy if exists "owner updates payout status" on template_sales;
create policy "owner updates payout status" on template_sales
  for update using ((auth.jwt() ->> 'email') = 'prithivivijayakumar.work@gmail.com');

-- Keeps templates.sales_count accurate without giving buyers write access to
-- the templates table (RLS above only lets the seller write their own rows).
-- security definer runs this with the function owner's privileges, bypassing
-- RLS for just this one scoped increment.
create or replace function increment_template_sales() returns trigger as $$
begin
  update templates set sales_count = sales_count + 1 where id::text = new.template_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_increment_template_sales on template_sales;
create trigger trg_increment_template_sales
  after insert on template_sales
  for each row execute function increment_template_sales();

-- ── 6. Affiliate program ────────────────────────────────────────────────────
-- affiliates: a user's referral handle + payout details.
-- referrals: one row per person who signed up via someone's ?ref= link.
create table if not exists affiliates (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  payout_email text,
  payout_method text default 'paypal',
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references auth.users(id) on delete cascade not null,  -- the affiliate who gets credit
  referred_user_id uuid references auth.users(id) on delete set null,     -- who signed up (may be null if not captured)
  referred_handle text,          -- the ?ref= handle used, denormalized
  converted boolean not null default false,  -- flipped true when the referred user pays
  created_at timestamptz not null default now()
);

-- Resilience: `create table if not exists` is a no-op if the table already
-- exists with an OLDER schema, so the columns below might be missing on a
-- pre-existing referrals/affiliates table (this is what caused the
-- "column referred_user_id does not exist" error). Add them explicitly so
-- the RLS policies that reference them can be created either way.
alter table referrals add column if not exists referrer_id uuid references auth.users(id) on delete cascade;
alter table referrals add column if not exists referred_user_id uuid references auth.users(id) on delete set null;
alter table referrals add column if not exists referred_handle text;
alter table referrals add column if not exists converted boolean not null default false;
alter table referrals add column if not exists created_at timestamptz not null default now();
alter table affiliates add column if not exists handle text;
alter table affiliates add column if not exists payout_email text;
alter table affiliates add column if not exists payout_method text default 'paypal';
alter table affiliates add column if not exists created_at timestamptz not null default now();

create index if not exists referrals_referrer_idx on referrals (referrer_id);

alter table affiliates enable row level security;
alter table referrals enable row level security;

drop policy if exists "users manage own affiliate row" on affiliates;
create policy "users manage own affiliate row" on affiliates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SECURITY FIX: the affiliates table holds payout_email (PII). A blanket
-- "select using (true)" would expose every user's payout email to every other
-- user. Instead, users can only read their OWN affiliate row (policy above
-- with FOR ALL covers select). Referral attribution at signup needs to map a
-- ?ref= handle to a user_id WITHOUT exposing anything else — done via this
-- security-definer function, which returns only the id.
drop policy if exists "anyone can look up affiliate handles" on affiliates;

create or replace function resolve_affiliate_id(h text) returns uuid as $$
  select user_id from affiliates where handle = lower(h) limit 1;
$$ language sql security definer stable;

drop policy if exists "affiliates view own referrals" on referrals;
create policy "affiliates view own referrals" on referrals
  for select using (auth.uid() = referrer_id);

-- A newly-signed-up user records their own referral row (referred_user_id =
-- themselves) attributing it to whoever referred them.
drop policy if exists "referred user records own referral" on referrals;
create policy "referred user records own referral" on referrals
  for insert with check (auth.uid() = referred_user_id);

-- ── 7. Feature requests (Roadmap page community board) ──────────────────────
create table if not exists feature_requests (
  id text primary key,
  title text not null,
  description text,
  category text default 'feature',
  votes int not null default 1,
  user_email text,
  created_at text
);

alter table feature_requests enable row level security;

-- Public board: anyone signed in can read all requests, submit their own, and
-- upvote. Kept permissive on purpose — it's a lightweight community wishlist,
-- not sensitive data.
drop policy if exists "anyone reads feature requests" on feature_requests;
create policy "anyone reads feature requests" on feature_requests for select using (true);

drop policy if exists "anyone submits feature requests" on feature_requests;
create policy "anyone submits feature requests" on feature_requests for insert with check (true);

drop policy if exists "anyone upvotes feature requests" on feature_requests;
create policy "anyone upvotes feature requests" on feature_requests for update using (true);

-- ============================================================================
-- Done. After running this, tell Claude Code (or just refresh the app) —
-- no restart needed, PostgREST picks up new tables/columns automatically.
-- ============================================================================
