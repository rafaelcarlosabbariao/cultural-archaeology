-- McWhy Phase 2: CulturalEvent store
-- Every successful Claude analysis is persisted here as a structured row.
-- full_analysis holds the entire Claude JSON response; normalized columns
-- exist only for fields we expect to query/sort/filter on.

create table cultural_events (
  id                   bigserial primary key,
  created_at           timestamptz not null default now(),
  question             text not null,
  signal               text not null,
  signal_type          text check (signal_type in ('lexical','behavioral','consumption')),
  first_emergence_year int,
  inflection_year      int,
  mainstream_year      int,
  counter_signal_pct   int,
  full_analysis        jsonb not null,
  trends_series        jsonb,
  related_correlations jsonb
);

create index cultural_events_signal_idx on cultural_events (signal);
create index cultural_events_created_at_idx on cultural_events (created_at desc);
create index cultural_events_full_analysis_gin on cultural_events using gin (full_analysis);
