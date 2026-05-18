create extension if not exists pgcrypto;

create table if not exists person (
  person_id bigserial primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists person_email_uidx on person (email);

create table if not exists app_user (
  user_id bigserial primary key,
  person_id bigint not null references person(person_id) on delete cascade,
  itu_student_id text,
  user_type text not null default 'student' check (user_type in ('student', 'staff', 'venue_admin', 'system_admin')),
  is_active boolean not null default true,
  notif_enabled boolean not null default true
);

create unique index if not exists app_user_person_uidx on app_user (person_id);

create table if not exists venue (
  venue_id bigserial primary key,
  venue_name text not null,
  venue_type text not null check (venue_type in ('library', 'cafeteria', 'cafe')),
  max_capacity integer not null check (max_capacity > 0),
  campus_area text,
  alert_threshold numeric(5,2) not null default 75,
  noise_alert_threshold_db numeric(5,2) not null default 75,
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_active boolean not null default true
);

create unique index if not exists venue_name_uidx on venue (venue_name);

create table if not exists sensor (
  sensor_id bigserial primary key,
  venue_id bigint not null references venue(venue_id) on delete cascade,
  sensor_type text not null check (sensor_type in ('PIR', 'magnetic')),
  door_label text,
  install_date date,
  is_active boolean not null default true
);

create table if not exists sensor_reading (
  reading_id bigserial primary key,
  sensor_id bigint not null references sensor(sensor_id) on delete cascade,
  reading_time timestamptz not null default now(),
  entry_count integer not null default 0,
  exit_count integer not null default 0,
  transmit_status text not null default 'ok'
);

create table if not exists occupancy_record (
  occupancy_id bigserial primary key,
  venue_id bigint not null references venue(venue_id) on delete cascade,
  record_time timestamptz not null default now(),
  current_count integer not null default 0,
  occupancy_rate numeric(5,2) not null default 0,
  occupancy_level text not null check (occupancy_level in ('low', 'moderate', 'high')),
  is_anomaly boolean not null default false
);

create table if not exists occupancy_prediction (
  prediction_id bigserial primary key,
  venue_id bigint not null references venue(venue_id) on delete cascade,
  created_at timestamptz not null default now(),
  target_time timestamptz not null,
  predicted_count integer not null,
  predicted_rate numeric(5,2) not null,
  model_used text not null default 'baseline_v1'
);

create table if not exists capacity_alert (
  alert_id bigserial primary key,
  venue_id bigint not null references venue(venue_id) on delete cascade,
  triggered_at timestamptz not null default now(),
  occupancy_rate numeric(5,2) not null,
  alert_type text not null default 'capacity',
  admin_user_id bigint references app_user(user_id) on delete set null,
  alert_status text not null default 'sent' check (alert_status in ('sent', 'acknowledged', 'resolved'))
);

create table if not exists notification (
  notification_id bigserial primary key,
  user_id bigint not null references app_user(user_id) on delete cascade,
  venue_id bigint references venue(venue_id) on delete cascade,
  message text not null,
  notif_type text not null check (notif_type in ('recommendation', 'alert', 'favorite_free', 'noise_alert')),
  sent_at timestamptz not null default now(),
  is_read boolean not null default false,
  read_at timestamptz
);

create table if not exists user_favorite_venue (
  favorite_id bigserial primary key,
  user_id bigint not null references app_user(user_id) on delete cascade,
  venue_id bigint not null references venue(venue_id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (user_id, venue_id)
);

create table if not exists management_report (
  report_id bigserial primary key,
  venue_id bigint not null references venue(venue_id) on delete cascade,
  generated_by bigint references app_user(user_id) on delete set null,
  period_type text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  avg_occupancy numeric(5,2),
  peak_occupancy numeric(5,2),
  avg_noise_db numeric(5,2),
  peak_noise_db numeric(5,2)
);

create table if not exists calendar_event (
  event_id bigserial primary key,
  event_date date not null,
  event_type text not null,
  description text,
  affects_all boolean not null default true
);

create table if not exists noise_sensor (
  noise_sensor_id bigserial primary key,
  venue_id bigint not null references venue(venue_id) on delete cascade,
  location_description text,
  model text,
  install_date date,
  is_active boolean not null default true
);

create table if not exists noise_reading (
  noise_reading_id bigserial primary key,
  noise_sensor_id bigint not null references noise_sensor(noise_sensor_id) on delete cascade,
  reading_time timestamptz not null default now(),
  decibel_value numeric(5,2) not null,
  noise_level text not null check (noise_level in ('quiet', 'moderate', 'loud', 'very_loud')),
  transmit_status text not null default 'ok'
);

create table if not exists noise_record (
  noise_record_id bigserial primary key,
  venue_id bigint not null references venue(venue_id) on delete cascade,
  record_time timestamptz not null default now(),
  avg_decibel numeric(5,2) not null,
  max_decibel numeric(5,2) not null,
  noise_level text not null check (noise_level in ('quiet', 'moderate', 'loud', 'very_loud'))
);

create or replace function public.current_app_user_id()
returns bigint
language sql
security definer
set search_path = public
as $$
  select au.user_id
  from app_user au
  join person p on p.person_id = au.person_id
  where lower(p.email) = lower(auth.jwt()->>'email')
    and au.is_active = true
  limit 1
$$;

create or replace function public.current_app_role()
returns text
language sql
security definer
set search_path = public
as $$
  select au.user_type
  from app_user au
  join person p on p.person_id = au.person_id
  where lower(p.email) = lower(auth.jwt()->>'email')
    and au.is_active = true
  limit 1
$$;

insert into person (first_name, last_name, email)
values
  ('Admin', 'ITU', 'admin@itu.edu.tr'),
  ('Kutuphane', 'Mudur', 'kutuphane.mudur@itu.edu.tr'),
  ('Student', 'Demo', '070230296@itu.edu.tr')
on conflict (email) do update
set first_name = excluded.first_name,
    last_name = excluded.last_name;

insert into app_user (person_id, itu_student_id, user_type, is_active, notif_enabled)
select person_id, null, 'system_admin', true, true from person where lower(email) = 'admin@itu.edu.tr'
on conflict (person_id) do update set user_type = excluded.user_type, is_active = true;

insert into app_user (person_id, itu_student_id, user_type, is_active, notif_enabled)
select person_id, null, 'venue_admin', true, true from person where lower(email) = 'kutuphane.mudur@itu.edu.tr'
on conflict (person_id) do update set user_type = excluded.user_type, is_active = true;

insert into app_user (person_id, itu_student_id, user_type, is_active, notif_enabled)
select person_id, '070230296', 'student', true, true from person where lower(email) = '070230296@itu.edu.tr'
on conflict (person_id) do update set user_type = excluded.user_type, itu_student_id = excluded.itu_student_id, is_active = true;

update venue set venue_name = 'Mustafa İnan Kütüphanesi' where venue_name = 'Mustafa Inan Kutuphanesi';
update venue set venue_name = 'Rektörlük Kütüphanesi' where venue_name = 'Rektorluk Kutuphanesi';
update venue set venue_name = 'Mühendislik Kafe' where venue_name = 'Muhendislik Kafe';

insert into venue (venue_name, venue_type, max_capacity, campus_area, alert_threshold, noise_alert_threshold_db, latitude, longitude, is_active)
values
  ('Mustafa İnan Kütüphanesi', 'library', 400, 'Ayazaga', 75, 70, 41.10540, 29.02395, true),
  ('Rektörlük Kütüphanesi', 'library', 150, 'Ayazaga', 75, 70, 41.10460, 29.02280, true),
  ('Merkez Yemekhane', 'cafeteria', 600, 'Ayazaga', 80, 75, 41.10490, 29.02310, true),
  ('Merkez Kafe', 'cafe', 80, 'Ayazaga', 75, 70, 41.10500, 29.02320, true),
  ('Mühendislik Kafe', 'cafe', 60, 'Ayazaga', 75, 70, 41.10580, 29.02430, true)
on conflict (venue_name) do update
set venue_type = excluded.venue_type,
    max_capacity = excluded.max_capacity,
    campus_area = excluded.campus_area,
    alert_threshold = excluded.alert_threshold,
    noise_alert_threshold_db = excluded.noise_alert_threshold_db,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    is_active = true;

insert into sensor (venue_id, sensor_type, door_label, install_date, is_active)
select v.venue_id, 'PIR', 'Main Entrance', current_date - 20, true
from venue v
where not exists (select 1 from sensor s where s.venue_id = v.venue_id and s.door_label = 'Main Entrance');

insert into sensor (venue_id, sensor_type, door_label, install_date, is_active)
select v.venue_id, 'magnetic', 'Side Door', current_date - 18, true
from venue v
where v.venue_type in ('library', 'cafeteria')
  and not exists (select 1 from sensor s where s.venue_id = v.venue_id and s.door_label = 'Side Door');

insert into noise_sensor (venue_id, location_description, model, install_date, is_active)
select v.venue_id, 'Main seating area', 'Decibel-X100', current_date - 14, true
from venue v
where not exists (select 1 from noise_sensor ns where ns.venue_id = v.venue_id and ns.location_description = 'Main seating area');

insert into sensor_reading (sensor_id, reading_time, entry_count, exit_count, transmit_status)
select s.sensor_id, now() - (g.step * interval '10 minutes'), 8 + (s.sensor_id % 5), 5 + (s.sensor_id % 4), 'ok'
from sensor s
cross join generate_series(0, 5) as g(step)
where not exists (select 1 from sensor_reading);

insert into occupancy_record (venue_id, record_time, current_count, occupancy_rate, occupancy_level, is_anomaly)
select
  v.venue_id,
  now() - (g.step * interval '1 hour'),
  calc.current_count,
  round((calc.current_count::numeric / v.max_capacity) * 100, 2),
  case
    when (calc.current_count::numeric / v.max_capacity) * 100 <= 40 then 'low'
    when (calc.current_count::numeric / v.max_capacity) * 100 <= 75 then 'moderate'
    else 'high'
  end,
  false
from venue v
cross join generate_series(0, 23, 3) as g(step)
cross join lateral (
  select greatest(
    0,
    least(
      v.max_capacity,
      (
        case v.venue_type
          when 'library' then v.max_capacity * 0.56
          when 'cafeteria' then v.max_capacity * 0.72
          else v.max_capacity * 0.48
        end
        + (sin(g.step + v.venue_id) * v.max_capacity * 0.12)
      )::integer
    )
  ) as current_count
) calc
where not exists (select 1 from occupancy_record);

insert into noise_reading (noise_sensor_id, reading_time, decibel_value, noise_level, transmit_status)
select
  ns.noise_sensor_id,
  now() - (g.step * interval '10 minutes'),
  calc.db,
  case
    when calc.db < 45 then 'quiet'
    when calc.db < 60 then 'moderate'
    when calc.db < 75 then 'loud'
    else 'very_loud'
  end,
  'ok'
from noise_sensor ns
join venue v on v.venue_id = ns.venue_id
cross join generate_series(0, 5) as g(step)
cross join lateral (
  select round((
    case v.venue_type
      when 'library' then 42
      when 'cafeteria' then 66
      else 58
    end
    + sin(g.step + ns.noise_sensor_id) * 6
  )::numeric, 2) as db
) calc
where not exists (select 1 from noise_reading);

insert into noise_record (venue_id, record_time, avg_decibel, max_decibel, noise_level)
select
  v.venue_id,
  now() - (g.step * interval '1 hour'),
  calc.avg_db,
  calc.avg_db + 7,
  case
    when calc.avg_db < 45 then 'quiet'
    when calc.avg_db < 60 then 'moderate'
    when calc.avg_db < 75 then 'loud'
    else 'very_loud'
  end
from venue v
cross join generate_series(0, 23, 3) as g(step)
cross join lateral (
  select round((
    case v.venue_type
      when 'library' then 43
      when 'cafeteria' then 68
      else 57
    end
    + sin(g.step + v.venue_id) * 5
  )::numeric, 2) as avg_db
) calc
where not exists (select 1 from noise_record);

insert into occupancy_prediction (venue_id, created_at, target_time, predicted_count, predicted_rate, model_used)
select
  v.venue_id,
  now(),
  now() + (g.step * interval '1 hour'),
  calc.predicted_count,
  round((calc.predicted_count::numeric / v.max_capacity) * 100, 2),
  'baseline_v1'
from venue v
cross join generate_series(1, 6) as g(step)
cross join lateral (
  select greatest(
    0,
    least(v.max_capacity, (v.max_capacity * (0.45 + (g.step * 0.04)) + sin(g.step + v.venue_id) * 20)::integer)
  ) as predicted_count
) calc
where not exists (select 1 from occupancy_prediction where target_time > now());

insert into capacity_alert (venue_id, triggered_at, occupancy_rate, alert_type, admin_user_id, alert_status)
select
  v.venue_id,
  now() - interval '25 minutes',
  82,
  'capacity',
  au.user_id,
  'sent'
from venue v
left join app_user au on au.user_type = 'venue_admin'
where v.venue_name = 'Merkez Yemekhane'
  and not exists (select 1 from capacity_alert);

insert into notification (user_id, venue_id, message, notif_type, sent_at, is_read)
select
  au.user_id,
  v.venue_id,
  'Mustafa İnan Kütüphanesi is currently quieter than usual.',
  'recommendation',
  now() - interval '12 minutes',
  false
from app_user au
join person p on p.person_id = au.person_id
join venue v on v.venue_name = 'Mustafa İnan Kütüphanesi'
where lower(p.email) = '070230296@itu.edu.tr'
  and not exists (select 1 from notification n where n.user_id = au.user_id);

insert into user_favorite_venue (user_id, venue_id)
select au.user_id, v.venue_id
from app_user au
join person p on p.person_id = au.person_id
join venue v on v.venue_name = 'Mustafa İnan Kütüphanesi'
where lower(p.email) = '070230296@itu.edu.tr'
on conflict (user_id, venue_id) do nothing;

insert into management_report (venue_id, generated_by, period_type, period_start, period_end, avg_occupancy, peak_occupancy, avg_noise_db, peak_noise_db)
select
  v.venue_id,
  au.user_id,
  'daily',
  date_trunc('day', now()) - interval '1 day',
  date_trunc('day', now()),
  coalesce(avg(o.occupancy_rate), 0),
  coalesce(max(o.occupancy_rate), 0),
  coalesce(avg(n.avg_decibel), 0),
  coalesce(max(n.max_decibel), 0)
from venue v
left join occupancy_record o on o.venue_id = v.venue_id
left join noise_record n on n.venue_id = v.venue_id
left join app_user au on au.user_type = 'system_admin'
where not exists (select 1 from management_report)
group by v.venue_id, au.user_id;

insert into calendar_event (event_date, event_type, description, affects_all)
select current_date, 'semester_week', 'Regular semester operations', true
where not exists (select 1 from calendar_event);

create or replace view v_current_occupancy as
select distinct on (v.venue_id)
  v.venue_id,
  v.venue_name,
  v.venue_type,
  v.max_capacity,
  v.latitude,
  v.longitude,
  v.is_active,
  o.current_count,
  o.occupancy_rate,
  o.occupancy_level,
  o.is_anomaly,
  o.record_time
from venue v
left join occupancy_record o on o.venue_id = v.venue_id
order by v.venue_id, o.record_time desc nulls last;

create or replace view v_current_noise as
select distinct on (v.venue_id)
  v.venue_id,
  v.venue_name,
  n.avg_decibel,
  n.max_decibel,
  n.noise_level,
  n.record_time
from venue v
left join noise_record n on n.venue_id = v.venue_id
order by v.venue_id, n.record_time desc nulls last;

create or replace view v_venue_map_status as
select
  o.venue_id,
  o.venue_name,
  o.venue_type,
  o.max_capacity,
  o.latitude,
  o.longitude,
  o.is_active,
  o.current_count,
  o.occupancy_rate,
  o.occupancy_level,
  o.is_anomaly,
  o.record_time,
  n.avg_decibel,
  n.max_decibel,
  n.noise_level,
  n.record_time as noise_record_time
from v_current_occupancy o
left join v_current_noise n on n.venue_id = o.venue_id;

alter table person enable row level security;
alter table app_user enable row level security;
alter table venue enable row level security;
alter table sensor enable row level security;
alter table sensor_reading enable row level security;
alter table occupancy_record enable row level security;
alter table occupancy_prediction enable row level security;
alter table capacity_alert enable row level security;
alter table notification enable row level security;
alter table user_favorite_venue enable row level security;
alter table management_report enable row level security;
alter table calendar_event enable row level security;
alter table noise_sensor enable row level security;
alter table noise_reading enable row level security;
alter table noise_record enable row level security;

drop policy if exists "person_select_own_or_admin" on person;
create policy "person_select_own_or_admin" on person
  for select to authenticated
  using (lower(email) = lower(auth.jwt()->>'email') or public.current_app_role() in ('venue_admin', 'system_admin'));

drop policy if exists "person_insert_own" on person;
create policy "person_insert_own" on person
  for insert to authenticated
  with check (true);

drop policy if exists "app_user_select_own_or_admin" on app_user;
create policy "app_user_select_own_or_admin" on app_user
  for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_app_role() in ('venue_admin', 'system_admin'));

drop policy if exists "app_user_insert_own" on app_user;
create policy "app_user_insert_own" on app_user
  for insert to authenticated
  with check (
    person_id = (
      select p.person_id
      from person p
      where lower(p.email) = lower(auth.jwt()->>'email')
      limit 1
    )
  );

drop policy if exists "venue_select_active" on venue;
create policy "venue_select_active" on venue
  for select to authenticated
  using (is_active = true or public.current_app_role() in ('venue_admin', 'system_admin'));

drop policy if exists "occupancy_record_select" on occupancy_record;
create policy "occupancy_record_select" on occupancy_record
  for select to authenticated
  using (true);

drop policy if exists "noise_record_select" on noise_record;
create policy "noise_record_select" on noise_record
  for select to authenticated
  using (true);

drop policy if exists "occupancy_prediction_select" on occupancy_prediction;
create policy "occupancy_prediction_select" on occupancy_prediction
  for select to authenticated
  using (true);

drop policy if exists "sensor_select" on sensor;
create policy "sensor_select" on sensor
  for select to authenticated
  using (is_active = true or public.current_app_role() in ('venue_admin', 'system_admin'));

drop policy if exists "noise_sensor_select" on noise_sensor;
create policy "noise_sensor_select" on noise_sensor
  for select to authenticated
  using (is_active = true or public.current_app_role() in ('venue_admin', 'system_admin'));

drop policy if exists "sensor_reading_select_admin" on sensor_reading;
create policy "sensor_reading_select_admin" on sensor_reading
  for select to authenticated
  using (public.current_app_role() in ('venue_admin', 'system_admin'));

drop policy if exists "noise_reading_select_admin" on noise_reading;
create policy "noise_reading_select_admin" on noise_reading
  for select to authenticated
  using (public.current_app_role() in ('venue_admin', 'system_admin'));

drop policy if exists "capacity_alert_select_admin" on capacity_alert;
create policy "capacity_alert_select_admin" on capacity_alert
  for select to authenticated
  using (public.current_app_role() in ('venue_admin', 'system_admin'));

drop policy if exists "notification_select_own" on notification;
create policy "notification_select_own" on notification
  for select to authenticated
  using (user_id = public.current_app_user_id());

drop policy if exists "notification_update_own" on notification;
create policy "notification_update_own" on notification
  for update to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists "favorite_select_own" on user_favorite_venue;
create policy "favorite_select_own" on user_favorite_venue
  for select to authenticated
  using (user_id = public.current_app_user_id());

drop policy if exists "favorite_insert_own" on user_favorite_venue;
create policy "favorite_insert_own" on user_favorite_venue
  for insert to authenticated
  with check (user_id = public.current_app_user_id());

drop policy if exists "favorite_delete_own" on user_favorite_venue;
create policy "favorite_delete_own" on user_favorite_venue
  for delete to authenticated
  using (user_id = public.current_app_user_id());

drop policy if exists "management_report_select_admin" on management_report;
create policy "management_report_select_admin" on management_report
  for select to authenticated
  using (public.current_app_role() in ('venue_admin', 'system_admin'));

drop policy if exists "calendar_select" on calendar_event;
create policy "calendar_select" on calendar_event
  for select to authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant select on v_current_occupancy, v_current_noise, v_venue_map_status to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'occupancy_record'
  ) then
    alter publication supabase_realtime add table occupancy_record;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'noise_record'
  ) then
    alter publication supabase_realtime add table noise_record;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification'
  ) then
    alter publication supabase_realtime add table notification;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'capacity_alert'
  ) then
    alter publication supabase_realtime add table capacity_alert;
  end if;
exception
  when undefined_object then
    null;
end $$;
