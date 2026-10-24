-- Vivix P2B 輕社交 schema
-- 在 Supabase Dashboard → SQL Editor 貼上執行。
-- 原則：只同步「訓練有無 / 週目標進度」，不同步重量、體重、照片。

-- 1. profiles：使用者公開名片（friend_code 用來加好友）
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '訓練者',
  friend_code text not null unique,
  created_at timestamptz not null default now()
);

-- 2. friendships：雙向同意好友（pending → accepted）
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

-- 3. weekly_presence：每週訓練 presence（每人每週一列）
create table if not exists public.weekly_presence (
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  training_days int not null default 0,
  weekly_goal int not null default 3,
  trained_today boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- ============ RLS ============

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.weekly_presence enable row level security;

-- profiles：任何人可用 friend_code 查（加好友用），本人可改
create policy profiles_select on public.profiles
  for select using (true);
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles
  for update using (auth.uid() = id);

-- friendships：只能看/改自己參與的
create policy friendships_select on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy friendships_insert on public.friendships
  for insert with check (auth.uid() = user_id);
-- 被加的一方可以 accept（update status）；雙方都可刪除（解除好友/拒絕）
create policy friendships_update on public.friendships
  for update using (auth.uid() = friend_id or auth.uid() = user_id);
create policy friendships_delete on public.friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- weekly_presence：本人可寫；本人 + 已接受的好友可讀
create policy presence_select on public.weekly_presence
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.user_id = auth.uid() and f.friend_id = weekly_presence.user_id)
          or (f.friend_id = auth.uid() and f.user_id = weekly_presence.user_id))
    )
  );
create policy presence_insert on public.weekly_presence
  for insert with check (auth.uid() = user_id);
create policy presence_update on public.weekly_presence
  for update using (auth.uid() = user_id);

-- ============ friend_code 自動產生（8 碼） ============
create or replace function public.generate_friend_code()
returns text language plpgsql as $$
declare
  code text;
begin
  loop
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end $$;

-- 新用戶註冊時自動建 profile（匿名登入也會觸發）
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, friend_code)
  values (new.id, '訓練者', public.generate_friend_code())
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
