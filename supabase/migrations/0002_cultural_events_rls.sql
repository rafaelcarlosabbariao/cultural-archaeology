-- McWhy Phase 2: enable Row Level Security on cultural_events
-- The landing page queries this table with the anon key. Without explicit
-- policies, RLS (if enabled in the dashboard) blocks anon SELECT/INSERT and
-- the Recent Searches panel fails with "permission denied".

alter table cultural_events enable row level security;

create policy "anon read cultural_events"
  on cultural_events
  for select
  to anon
  using (true);

create policy "anon insert cultural_events"
  on cultural_events
  for insert
  to anon
  with check (true);
