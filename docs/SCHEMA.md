# VocabLoop Database Schema

## Overview

This document describes the Supabase PostgreSQL schema for VocabLoop cloud sync.

## Tables

### users

Automatically managed by Supabase Auth. Extended with sync metadata.

```sql
-- This extends the auth.users table
create table public.user_profiles (
  id uuid references auth.users(id) primary key,
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.user_profiles enable row level security;

-- Users can only see/modify their own profile
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.user_profiles
  for insert with check (auth.uid() = id);
```

### cards

Mirrors the local Card interface with sync metadata.

```sql
create table public.cards (
  id text primary key,
  user_id uuid references auth.users(id) not null,

  -- Card type and content
  type text not null check (type in ('BASIC', 'CLOZE', 'VERB')),
  front text not null,
  back text not null,
  example_es text,
  example_en text,
  notes text,
  tags text[] default '{}',

  -- Cloze-specific
  cloze_sentence text,
  cloze_word text,

  -- SRS fields
  ease numeric not null default 2.5,
  interval_days numeric not null default 0,
  reps integer not null default 0,
  due_at bigint not null,
  lapses integer not null default 0,
  last_reviewed_at bigint,

  -- Timestamps (stored as Unix ms for client compatibility)
  created_at bigint not null,
  updated_at bigint not null,

  -- Server sync metadata
  server_updated_at timestamptz default now(),
  deleted_at timestamptz -- Soft delete for sync
);

-- Enable RLS
alter table public.cards enable row level security;

-- Users can only access their own cards
create policy "Users can view own cards" on public.cards
  for select using (auth.uid() = user_id);

create policy "Users can insert own cards" on public.cards
  for insert with check (auth.uid() = user_id);

create policy "Users can update own cards" on public.cards
  for update using (auth.uid() = user_id);

create policy "Users can delete own cards" on public.cards
  for delete using (auth.uid() = user_id);

-- Index for efficient sync queries
create index cards_user_updated_idx on public.cards(user_id, server_updated_at);
create index cards_user_deleted_idx on public.cards(user_id, deleted_at) where deleted_at is null;
```

### reviews

Stores review log entries for sync.

```sql
create table public.reviews (
  id text primary key,
  user_id uuid references auth.users(id) not null,
  card_id text not null,

  reviewed_at bigint not null,
  grade text not null check (grade in ('again', 'hard', 'good', 'easy')),
  previous_interval numeric not null,
  new_interval numeric not null,
  previous_due_at bigint not null,
  new_due_at bigint not null,

  -- Server metadata
  server_created_at timestamptz default now()
);

-- Enable RLS
alter table public.reviews enable row level security;

-- Users can only access their own reviews
create policy "Users can view own reviews" on public.reviews
  for select using (auth.uid() = user_id);

create policy "Users can insert own reviews" on public.reviews
  for insert with check (auth.uid() = user_id);

-- Reviews are immutable - no update/delete policies

-- Index for efficient queries
create index reviews_user_card_idx on public.reviews(user_id, card_id);
create index reviews_user_time_idx on public.reviews(user_id, server_created_at);
```

### sync_log

Audit trail for sync operations.

```sql
create table public.sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  action text not null check (action in ('upload', 'download', 'merge', 'conflict_resolved')),
  timestamp timestamptz default now(),
  cards_affected integer default 0,
  reviews_affected integer default 0,
  payload_hash text, -- For deduplication
  details jsonb -- Additional context
);

-- Enable RLS
alter table public.sync_log enable row level security;

-- Users can only access their own sync logs
create policy "Users can view own sync logs" on public.sync_log
  for select using (auth.uid() = user_id);

create policy "Users can insert own sync logs" on public.sync_log
  for insert with check (auth.uid() = user_id);

-- Index for recent sync queries
create index sync_log_user_time_idx on public.sync_log(user_id, timestamp desc);
```

## Functions

### Trigger for server_updated_at

```sql
create or replace function update_server_timestamp()
returns trigger as $$
begin
  new.server_updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cards_server_updated
  before update on public.cards
  for each row execute function update_server_timestamp();
```

### Get changes since last sync

```sql
create or replace function get_card_changes(
  p_user_id uuid,
  p_since timestamptz
)
returns setof public.cards as $$
begin
  return query
    select *
    from public.cards
    where user_id = p_user_id
      and server_updated_at > p_since;
end;
$$ language plpgsql security definer;
```

## Setup Instructions

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the above schema statements in order
3. Copy your project URL and anon key to `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Enable Email auth in Authentication > Providers
5. Configure redirect URLs in Authentication > URL Configuration

## Data Flow

### Initial Sync (First Login)

1. User signs in with magic link
2. If remote has cards: download all to IndexedDB
3. If local has cards (offline usage): upload all to Supabase
4. Merge any conflicts (last-write-wins by updatedAt)

### Incremental Sync

1. Get local changes since lastSyncAt
2. Get remote changes since lastSyncAt
3. Upload local changes
4. Download remote changes
5. Merge with conflict detection
6. Update lastSyncAt

### Conflict Resolution

When the same card is modified on multiple devices:

1. Compare updatedAt timestamps
2. If within 1 minute, show conflict UI
3. User chooses: Keep Local, Keep Remote, or Keep Both
4. Log resolution in sync_log

## Encryption

Card content (front, back, examples, notes) is encrypted client-side before upload.
See `src/utils/encryption.ts` for implementation details.

Encrypted fields:
- front
- back
- example_es
- example_en
- notes
- cloze_sentence
- cloze_word

Non-encrypted fields (needed for queries):
- id, user_id, type, tags
- ease, interval_days, reps, due_at, lapses
- timestamps
