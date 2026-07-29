-- Trend thumbnail store: one representative image per trend term, shown on the
-- landing-field pills and Live Trends cards. Harvested from Wikipedia lead
-- images (scripts/harvest_trend_images.py); anon read only, writes are
-- server-side via the harvest script.

create table if not exists trend_images (
  term       text primary key,
  thumb_url  text not null,
  image_url  text,
  page_url   text,
  page_title text,
  source     text not null default 'wikipedia',
  fetched_at timestamptz not null default now()
);

alter table trend_images enable row level security;

create policy anon_read_trend_images on trend_images for select using (true);
