create or replace function public.replace_laliga_snapshot(
  p_fantasy_team_id uuid,
  p_league_id text,
  p_team_name text,
  p_balance numeric,
  p_squad_value numeric,
  p_squad jsonb,
  p_market jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_team_id uuid := p_fantasy_team_id;
  v_squad_count integer;
  v_market_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_league_id is null
    or p_league_id !~ '^[A-Za-z0-9_-]{1,100}$'
    or nullif(btrim(p_team_name), '') is null
    or char_length(p_team_name) > 160
    or p_balance is null
    or p_balance < -1000000000000
    or p_balance > 1000000000000
    or p_squad_value is null
    or p_squad_value < 0
    or p_squad_value > 1000000000000
  then
    raise exception using errcode = '22023', message = 'Invalid team snapshot';
  end if;

  if p_squad is null
    or jsonb_typeof(p_squad) <> 'array'
    or jsonb_array_length(p_squad) > 50
    or p_market is null
    or jsonb_typeof(p_market) <> 'array'
    or jsonb_array_length(p_market) > 500
  then
    raise exception using errcode = '22023', message = 'Invalid snapshot size';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_squad) as x(
      name text,
      position text,
      club text,
      current_value numeric,
      external_player_id text,
      external_player_team_id text,
      is_starter boolean
    )
    where nullif(btrim(x.name), '') is null
      or char_length(x.name) > 160
      or x.position not in ('GK', 'DEF', 'MID', 'FWD')
      or (x.club is not null and char_length(x.club) > 120)
      or x.external_player_id is null
      or x.external_player_id !~ '^[A-Za-z0-9_-]{1,100}$'
      or (
        x.external_player_team_id is not null
        and x.external_player_team_id !~ '^[A-Za-z0-9_-]{1,100}$'
      )
      or x.current_value < 0
      or x.current_value > 1000000000000
  ) then
    raise exception using errcode = '22023', message = 'Invalid squad item';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_squad) as x(external_player_id text)
    group by x.external_player_id
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Duplicate squad item';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_market) as x(
      name text,
      position text,
      club text,
      asking_price numeric,
      market_value numeric,
      seller_name text,
      expires_at timestamptz,
      external_player_id text,
      external_market_id text
    )
    where nullif(btrim(x.name), '') is null
      or char_length(x.name) > 160
      or x.position not in ('GK', 'DEF', 'MID', 'FWD')
      or (x.club is not null and char_length(x.club) > 120)
      or (x.seller_name is not null and char_length(x.seller_name) > 160)
      or x.external_player_id is null
      or x.external_player_id !~ '^[A-Za-z0-9_-]{1,100}$'
      or x.external_market_id is null
      or x.external_market_id !~ '^[A-Za-z0-9_-]{1,100}$'
      or x.asking_price < 0
      or x.asking_price > 1000000000000
      or x.market_value < 0
      or x.market_value > 1000000000000
  ) then
    raise exception using errcode = '22023', message = 'Invalid market item';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_market) as x(external_market_id text)
    group by x.external_market_id
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Duplicate market item';
  end if;

  if v_team_id is null then
    select ft.id
      into v_team_id
    from public.fantasy_teams as ft
    where ft.user_id = v_user_id
    order by ft.created_at
    limit 1;
  end if;

  if v_team_id is null then
    insert into public.fantasy_teams (
      user_id,
      name,
      balance,
      squad_value,
      source,
      external_league_id,
      updated_at
    )
    values (
      v_user_id,
      btrim(p_team_name),
      p_balance,
      p_squad_value,
      'official',
      p_league_id,
      now()
    )
    returning id into v_team_id;
  else
    if not exists (
      select 1
      from public.fantasy_teams as ft
      where ft.id = v_team_id and ft.user_id = v_user_id
    ) then
      raise exception using errcode = '42501', message = 'Team not owned by caller';
    end if;

    update public.fantasy_teams
    set name = btrim(p_team_name),
        balance = p_balance,
        squad_value = p_squad_value,
        source = 'official',
        external_league_id = p_league_id,
        updated_at = now()
    where id = v_team_id and user_id = v_user_id;
  end if;

  delete from public.squad_players
  where fantasy_team_id = v_team_id;

  insert into public.squad_players (
    fantasy_team_id,
    player_id,
    purchase_price,
    current_value,
    is_starter,
    is_captain,
    imported_name,
    imported_position,
    imported_club,
    external_player_id,
    external_player_team_id,
    source,
    updated_at
  )
  select
    v_team_id,
    null,
    null,
    x.current_value,
    coalesce(x.is_starter, false),
    false,
    btrim(x.name),
    x.position,
    nullif(btrim(x.club), ''),
    x.external_player_id,
    x.external_player_team_id,
    'official',
    now()
  from jsonb_to_recordset(p_squad) as x(
    name text,
    position text,
    club text,
    current_value numeric,
    external_player_id text,
    external_player_team_id text,
    is_starter boolean
  );

  delete from public.market_entries
  where fantasy_team_id = v_team_id;

  insert into public.market_entries (
    fantasy_team_id,
    player_id,
    asking_price,
    market_value,
    seller_name,
    expires_at,
    captured_at,
    source,
    imported_name,
    imported_position,
    imported_club,
    external_player_id,
    external_market_id
  )
  select
    v_team_id,
    null,
    x.asking_price,
    x.market_value,
    nullif(btrim(x.seller_name), ''),
    x.expires_at,
    now(),
    'official',
    btrim(x.name),
    x.position,
    nullif(btrim(x.club), ''),
    x.external_player_id,
    x.external_market_id
  from jsonb_to_recordset(p_market) as x(
    name text,
    position text,
    club text,
    asking_price numeric,
    market_value numeric,
    seller_name text,
    expires_at timestamptz,
    external_player_id text,
    external_market_id text
  );

  insert into public.onboarding_progress (
    user_id,
    current_step,
    completed,
    selected_import_method,
    updated_at
  )
  values (v_user_id, 4, true, 'laliga_private', now())
  on conflict (user_id) do update
    set current_step = 4,
        completed = true,
        selected_import_method = 'laliga_private',
        updated_at = now();

  v_squad_count := jsonb_array_length(p_squad);
  v_market_count := jsonb_array_length(p_market);

  return jsonb_build_object(
    'teamId', v_team_id,
    'squadCount', v_squad_count,
    'marketCount', v_market_count
  );
end;
$function$;

revoke all on function public.replace_laliga_snapshot(
  uuid, text, text, numeric, numeric, jsonb, jsonb
) from public, anon;
grant execute on function public.replace_laliga_snapshot(
  uuid, text, text, numeric, numeric, jsonb, jsonb
) to authenticated;
