create table if not exists users (
  id bigserial primary key,
  nickname text not null unique,
  password_hash text not null,
  totp_secret text,
  role text not null default 'player',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table users add column if not exists role text not null default 'player';
alter table users add column if not exists status text not null default 'active';

create table if not exists launcher_sessions (
  token text primary key,
  user_id bigint not null references users(id) on delete cascade,
  hwid_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists hwid_bans (
  hwid_hash text primary key,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists player_profiles (
  user_id bigint primary key references users(id) on delete cascade,
  youtube_url text,
  twitch_url text,
  spotify_connected boolean not null default false,
  spotify_display_name text,
  music jsonb not null default '{}'::jsonb,
  playtime_seconds bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table player_profiles add column if not exists playtime_seconds bigint not null default 0;

create table if not exists player_assets (
  user_id bigint not null references users(id) on delete cascade,
  asset_type text not null,
  url text not null,
  sha256 text not null,
  extension text not null default 'png',
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id, asset_type)
);

alter table player_assets add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists launcher_projects (
  id text primary key,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists launcher_sessions_user_id_idx on launcher_sessions(user_id);
create index if not exists launcher_sessions_expires_at_idx on launcher_sessions(expires_at);

create table if not exists project_servers (
  id text primary key,
  project_id text not null default 'unique',
  name text not null,
  host text not null,
  port integer not null default 25565,
  version text,
  motd text,
  player_count integer not null default 0,
  max_players integer not null default 0,
  tps numeric,
  priority integer not null default 0,
  last_seen_at timestamptz not null default now()
);

alter table project_servers add column if not exists project_id text not null default 'unique';
alter table project_servers add column if not exists motd text;
alter table project_servers add column if not exists priority integer not null default 0;
create index if not exists project_servers_last_seen_at_idx on project_servers(last_seen_at);
create index if not exists project_servers_project_id_idx on project_servers(project_id);

create table if not exists launcher_news (
  id bigserial primary key,
  title text not null,
  body text not null default '',
  url text,
  created_at timestamptz not null default now(),
  visible boolean not null default true
);

create table if not exists crash_reports (
  id bigserial primary key,
  user_id bigint references users(id) on delete set null,
  nickname text,
  hwid_hash text,
  analysis jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '{}'::jsonb,
  fingerprint text,
  created_at timestamptz not null default now()
);

alter table crash_reports add column if not exists fingerprint text;

create table if not exists password_reset_tokens (
  token text primary key,
  user_id bigint not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists security_events (
  id bigserial primary key,
  nickname text,
  hwid_hash text,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crash_reports_created_at_idx on crash_reports(created_at);
create index if not exists launcher_news_created_at_idx on launcher_news(created_at);
create index if not exists security_events_created_at_idx on security_events(created_at);
