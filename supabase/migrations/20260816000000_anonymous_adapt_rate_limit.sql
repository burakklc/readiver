create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table private.adapt_rate_limits (
  identifier_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  constraint adapt_rate_limits_identifier_not_blank
    check (length(btrim(identifier_hash)) > 0)
);

revoke all on table private.adapt_rate_limits from public, anon, authenticated;

create or replace function public.check_adapt_rate_limit(
  p_identifier_hash text,
  p_window_seconds integer,
  p_max_requests integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_time timestamptz := clock_timestamp();
  current_window_started_at timestamptz;
  current_request_count integer;
begin
  if length(btrim(p_identifier_hash)) = 0 then
    raise exception 'identifier hash must not be blank';
  end if;

  if p_window_seconds < 60 or p_window_seconds > 604800 then
    raise exception 'window seconds must be between 60 and 604800';
  end if;

  if p_max_requests < 1 or p_max_requests > 10000 then
    raise exception 'max requests must be between 1 and 10000';
  end if;

  insert into private.adapt_rate_limits as limits (
    identifier_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_identifier_hash, current_time, 1, current_time)
  on conflict (identifier_hash) do update
  set
    window_started_at = case
      when limits.window_started_at + make_interval(secs => p_window_seconds) <= current_time
        then current_time
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at + make_interval(secs => p_window_seconds) <= current_time
        then 1
      else limits.request_count + 1
    end,
    updated_at = current_time
  returning limits.window_started_at, limits.request_count
    into current_window_started_at, current_request_count;

  allowed := current_request_count <= p_max_requests;
  remaining := greatest(p_max_requests - current_request_count, 0);
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      ceil(
        extract(
          epoch from (
            current_window_started_at + make_interval(secs => p_window_seconds) - current_time
          )
        )
      )::integer,
      1
    )
  end;

  return next;
end;
$$;

revoke execute on function public.check_adapt_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_adapt_rate_limit(text, integer, integer)
  to service_role;

comment on table private.adapt_rate_limits is
  'Fixed-window anonymous adaptation counters keyed by a server-side HMAC; no raw IP addresses.';

comment on function public.check_adapt_rate_limit(text, integer, integer) is
  'Atomically consumes one anonymous adaptation allowance for a server-hashed identifier.';
