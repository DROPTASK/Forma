-- Forma fitness tracker — per-user tables + shared catalogs.

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  height_cm double precision,
  sex text,
  birth_year integer,
  activity_level text not null default 'moderate',
  goal_type text not null default 'maintain',
  goal_weight_kg double precision,
  goal_weight_high_kg double precision,
  calorie_goal integer not null default 2200,
  protein_goal integer not null default 160,
  carbs_goal integer not null default 220,
  fat_goal integer not null default 70,
  unit_pref text not null default 'kg',
  theme_pref text not null default 'system',
  onboarding_complete boolean not null default false,
  quiet_hours_start text,
  quiet_hours_end text,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exercises (
  id text primary key,
  user_id text,
  name text not null,
  muscle_groups text[] not null default '{}',
  equipment text not null default 'none',
  is_custom boolean not null default false,
  instructions text
);
create index if not exists exercises_user_id_idx on exercises (user_id);
create index if not exists exercises_name_idx on exercises (lower(name));

create table if not exists workout_sessions (
  id text primary key,
  user_id text not null,
  date date not null,
  title text,
  start_time timestamptz,
  end_time timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists workout_sessions_user_date_idx on workout_sessions (user_id, date desc);

create table if not exists set_logs (
  id text primary key,
  user_id text not null,
  session_id text not null references workout_sessions (id) on delete cascade,
  exercise_id text not null,
  exercise_name text not null,
  muscle_groups text[] not null default '{}',
  set_number integer not null,
  reps integer,
  weight_kg double precision,
  rpe double precision,
  rest_seconds integer,
  created_at timestamptz not null default now()
);
create index if not exists set_logs_user_session_idx on set_logs (user_id, session_id);
create index if not exists set_logs_user_exercise_idx on set_logs (user_id, exercise_id);

create table if not exists foods (
  id text primary key,
  user_id text,
  name text not null,
  calories_per_100g double precision not null,
  protein_g double precision not null default 0,
  carbs_g double precision not null default 0,
  fat_g double precision not null default 0,
  source text not null default 'local'
);
create index if not exists foods_user_id_idx on foods (user_id);
create index if not exists foods_name_idx on foods (lower(name));

create table if not exists meal_entries (
  id text primary key,
  user_id text not null,
  date date not null,
  meal_type text not null,
  food_id text,
  food_name text not null,
  quantity_g double precision not null,
  calories double precision not null,
  protein_g double precision not null default 0,
  carbs_g double precision not null default 0,
  fat_g double precision not null default 0,
  ai_parsed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists meal_entries_user_date_idx on meal_entries (user_id, date desc);

create table if not exists weight_entries (
  id text primary key,
  user_id text not null,
  date date not null,
  value_kg double precision not null,
  source text not null default 'manual',
  body_fat_pct double precision,
  device_name text,
  logged_at timestamptz not null default now()
);
create index if not exists weight_entries_user_date_idx on weight_entries (user_id, date desc);

create table if not exists daily_records (
  date date not null,
  user_id text not null,
  mood integer,
  notes text,
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists challenges (
  id text primary key,
  user_id text not null,
  title text not null,
  type text not null default 'streak',
  target_days integer not null default 30,
  start_date date not null,
  end_date date,
  daily_task text,
  grace_enabled boolean not null default false,
  reminder_time text,
  created_at timestamptz not null default now()
);
create index if not exists challenges_user_id_idx on challenges (user_id);

create table if not exists check_ins (
  id text primary key,
  user_id text not null,
  challenge_id text not null references challenges (id) on delete cascade,
  date date not null,
  completed boolean not null default true,
  unique (challenge_id, date)
);
create index if not exists check_ins_user_idx on check_ins (user_id, challenge_id);

create table if not exists todos (
  id text primary key,
  user_id text not null,
  title text not null,
  notes text,
  due_at timestamptz,
  remind_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists todos_user_id_idx on todos (user_id, done, due_at);

create table if not exists timetable_blocks (
  id text primary key,
  user_id text not null,
  day_of_week integer,
  specific_date date,
  start_time text not null,
  end_time text not null,
  title text not null,
  category text not null default 'other',
  reminder_minutes integer
);
create index if not exists timetable_blocks_user_idx on timetable_blocks (user_id);

create table if not exists diet_plans (
  id text primary key,
  user_id text not null,
  title text not null,
  goal_type text,
  calorie_target integer,
  diet_type text,
  restrictions text,
  meals_per_day integer,
  plan_json jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists diet_plans_user_idx on diet_plans (user_id, created_at desc);

create table if not exists body_snapshots (
  id text primary key,
  user_id text not null,
  date date not null,
  height_used_cm double precision not null,
  shoulder_width_cm double precision,
  arm_length_l_cm double precision,
  arm_length_r_cm double precision,
  torso_length_cm double precision,
  leg_length_l_cm double precision,
  leg_length_r_cm double precision,
  hip_width_cm double precision,
  estimated_waist_width_cm double precision,
  estimated_chest_width_cm double precision,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists body_snapshots_user_idx on body_snapshots (user_id, date desc);

create table if not exists ai_messages (
  id text primary key,
  user_id text not null,
  role text not null,
  content text not null,
  tool_payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_user_idx on ai_messages (user_id, created_at);

create table if not exists notification_rules (
  id text primary key,
  user_id text not null,
  category text not null,
  enabled boolean not null default true,
  default_time text
);
create unique index if not exists notification_rules_user_cat_idx on notification_rules (user_id, category);

create table if not exists playlists (
  id text primary key,
  user_id text not null,
  name text not null,
  is_workout boolean not null default false,
  linked_workout_type text,
  tracks_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists playlists_user_idx on playlists (user_id);

create table if not exists ble_devices (
  id text primary key,
  user_id text not null,
  name text not null,
  device_id text,
  kind text not null default 'scale',
  last_seen timestamptz
);
create index if not exists ble_devices_user_idx on ble_devices (user_id);
