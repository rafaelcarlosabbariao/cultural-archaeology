-- Positioning Audit: run store + queryable evidence receipts.
-- Unlike cultural_events (0001/0002), these tables take NO anon writes: inserts happen
-- server-side (service role) once the persistence function lands. Anon may read, which
-- powers a future public "recent audits" panel; revisit before any client-confidential use.

create table if not exists audit_runs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  subject text not null,
  url text,
  self_claim text,
  authorship_you_pct int,
  trust_score_pct int,
  trust_gated boolean,
  run_date date,
  version text,
  full_run jsonb not null
);

create index if not exists audit_runs_subject_idx on audit_runs (subject);
create index if not exists audit_runs_created_idx on audit_runs (created_at desc);
create index if not exists audit_runs_full_gin on audit_runs using gin (full_run);

create table if not exists audit_evidence (
  id bigserial primary key,
  run_id bigint not null references audit_runs (id) on delete cascade,
  receipt_id text not null,
  source text,
  date text,
  title text,
  url text,
  excerpt text,
  block text
);

create index if not exists audit_evidence_run_idx on audit_evidence (run_id);
create index if not exists audit_evidence_source_idx on audit_evidence (source);

alter table audit_runs enable row level security;
alter table audit_evidence enable row level security;

create policy "anon read audit_runs" on audit_runs for select using (true);
create policy "anon read audit_evidence" on audit_evidence for select using (true);
