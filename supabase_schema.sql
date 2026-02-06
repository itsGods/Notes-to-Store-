-- 1. RESET (Critical: Run this to replace the incorrect table from your screenshot)
-- This deletes the existing 'notes' table and all its data so we can recreate it correctly.
DROP TABLE IF EXISTS public.notes;

-- 2. Create the notes table with ALL required fields
create table public.notes (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text default '',
  content text default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  
  constraint notes_pkey primary key (id),
  constraint notes_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- 3. Enable Row Level Security (RLS)
alter table public.notes enable row level security;

-- 4. Create Indexes for Performance
-- Index on user_id makes filtering by user much faster
create index notes_user_id_idx on public.notes (user_id);
-- Index on updated_at makes sorting (Most Recent first) efficient
create index notes_updated_at_idx on public.notes (updated_at desc);

-- 5. Auto-update 'updated_at' on change
-- Function to handle the timestamp update
create or replace function public.handle_updated_at() 
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger execution
create trigger on_note_updated
  before update on public.notes
  for each row execute procedure public.handle_updated_at();

-- 6. Access Policies (RLS)

-- Policy: View own notes
create policy "Users can view their own notes"
on public.notes for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Insert own notes
create policy "Users can insert their own notes"
on public.notes for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy: Update own notes
create policy "Users can update their own notes"
on public.notes for update
to authenticated
using (auth.uid() = user_id);

-- Policy: Delete own notes
create policy "Users can delete their own notes"
on public.notes for delete
to authenticated
using (auth.uid() = user_id);