create type app.outbox_event_type as enum (
  'recommendation_published',
  'recommendation_response_recorded',
  'reputation_event_recorded'
);

create type app.outbox_event_status as enum (
  'pending',
  'processing',
  'processed',
  'failed'
);

create type app.outbox_aggregate_type as enum (
  'recommendation_post',
  'recommendation_reaction',
  'reputation_event'
);

create table app.outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type app.outbox_event_type not null,
  aggregate_type app.outbox_aggregate_type not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  status app.outbox_event_status not null default 'pending',
  retry_count integer not null default 0,
  max_retries integer not null default 12,
  next_run_at timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  locked_by text,
  lease_expires_at timestamptz,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint outbox_events_payload_object_check check (
    jsonb_typeof(payload) = 'object'
  ),
  constraint outbox_events_retry_count_nonnegative_check check (
    retry_count >= 0
  ),
  constraint outbox_events_max_retries_nonnegative_check check (
    max_retries >= 0
  ),
  constraint outbox_events_error_message_length_check check (
    error_message is null or char_length(error_message) <= 4000
  ),
  constraint outbox_events_processed_state_check check (
    (
      status = 'processed'
      and processed_at is not null
    )
    or (
      status <> 'processed'
      and processed_at is null
    )
  ),
  constraint outbox_events_processing_lock_state_check check (
    (
      status = 'processing'
      and locked_at is not null
      and locked_by is not null
      and lease_expires_at is not null
    )
    or (
      status <> 'processing'
      and locked_at is null
      and locked_by is null
      and lease_expires_at is null
    )
  )
);

create index outbox_events_ready_next_run_at_idx
  on app.outbox_events (next_run_at asc, created_at asc)
  where status = 'pending';

create index outbox_events_processing_lease_expires_at_idx
  on app.outbox_events (lease_expires_at asc)
  where status = 'processing';

create index outbox_events_aggregate_created_at_idx
  on app.outbox_events (aggregate_type, aggregate_id, created_at desc);

create index outbox_events_event_type_created_at_idx
  on app.outbox_events (event_type, created_at desc);

comment on table app.outbox_events is
  'Outbox durable del backend v2 para side effects asincronos; solo backend y service_role pueden leer o escribir aqui.';

comment on column app.outbox_events.next_run_at is
  'Instante mas temprano en el que el worker de polling debe volver a intentar el evento.';

comment on column app.outbox_events.lease_expires_at is
  'Limite de la lease del worker actual; permite recuperar eventos atascados si un worker cae.';

comment on column app.outbox_events.error_message is
  'Ultimo error resumido de procesamiento asincrono; no es superficie publica.';

grant usage on type
  app.outbox_event_type,
  app.outbox_event_status,
  app.outbox_aggregate_type
to service_role;

revoke all on table app.outbox_events from public;
revoke all on table app.outbox_events from anon;
revoke all on table app.outbox_events from authenticated;
grant all on table app.outbox_events to service_role;

alter table app.outbox_events enable row level security;
