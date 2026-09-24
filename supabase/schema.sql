-- ============================================================
-- Thushouse — Supabase schema
-- รันใน Supabase Dashboard → SQL Editor
-- ใช้ "if not exists" ทั้งหมด → รันซ้ำบนฐานข้อมูลที่มีตารางอยู่แล้วได้อย่างปลอดภัย
-- (จะเพิ่มเฉพาะคอลัมน์/นโยบายที่ยังไม่มี)
-- ============================================================

-- ---------- Tables ----------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.users add column if not exists membership_start timestamptz;
alter table public.users add column if not exists membership_end timestamptz;
alter table public.users add column if not exists last_login_at timestamptz;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  instructor text,
  price numeric not null default 0,
  videos_count int not null default 0,
  duration_hours numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.classes add column if not exists description text;
alter table public.classes add column if not exists thumbnail_url text;
alter table public.classes add column if not exists category text;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  amount numeric not null default 0,
  slip_image_url text,
  status text not null default 'pending', -- pending | approved | rejected
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.purchases add column if not exists rejection_reason text;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  video_url text not null,
  duration_seconds int not null default 0,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.videos add column if not exists description text;

create table if not exists public.watched_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);

create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scheduled_date timestamptz not null,
  zoom_link text,
  youtube_live_url text,
  discord_link text,
  status text not null default 'upcoming', -- upcoming | live | ended
  created_at timestamptz not null default now()
);
alter table public.live_classes add column if not exists instructor text;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  table_name text,
  record_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists purchases_user_idx on public.purchases(user_id);
create index if not exists purchases_status_idx on public.purchases(status);
create index if not exists videos_class_idx on public.videos(class_id, order_index);
create index if not exists watched_user_idx on public.watched_videos(user_id);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read);

-- ---------- สร้างแถวใน public.users อัตโนมัติเมื่อมีคนสมัคร ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, phone)
  values (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
-- ผู้ใช้ทั่วไปเข้าถึงได้เฉพาะข้อมูลของตัวเอง
-- งาน Admin ทั้งหมดทำผ่าน API ฝั่ง server ด้วย service role (ข้าม RLS)
alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.purchases enable row level security;
alter table public.videos enable row level security;
alter table public.watched_videos enable row level security;
alter table public.live_classes enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_logs enable row level security;

drop policy if exists "users: read own" on public.users;
create policy "users: read own" on public.users for select using (auth.uid() = id);
-- ไม่มี policy update: การแก้โปรไฟล์ทำผ่าน API (แก้ได้แค่ name/phone) เพื่อกันผู้ใช้แก้ status ตัวเอง
drop policy if exists "users: update own" on public.users;

drop policy if exists "classes: public read" on public.classes;
create policy "classes: public read" on public.classes for select using (true);

drop policy if exists "purchases: read own" on public.purchases;
create policy "purchases: read own" on public.purchases for select using (auth.uid() = user_id);

-- ดูรายการวิดีโอได้เฉพาะคอร์สที่ซื้อและได้รับอนุมัติแล้ว
drop policy if exists "videos: purchased only" on public.videos;
create policy "videos: purchased only" on public.videos for select using (
  exists (
    select 1 from public.purchases p
    where p.class_id = videos.class_id and p.user_id = auth.uid() and p.status = 'approved'
  )
);

drop policy if exists "watched: own" on public.watched_videos;
create policy "watched: own" on public.watched_videos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "live: members read" on public.live_classes;
create policy "live: members read" on public.live_classes for select using (auth.role() = 'authenticated');

drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "notifications: update own" on public.notifications;
create policy "notifications: update own" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- admin_logs: ไม่มี policy = ผู้ใช้ทั่วไปอ่าน/เขียนไม่ได้เลย

-- ---------- Storage ----------
-- slips = ส่วนตัว (Admin ดูผ่าน signed URL), thumbnails = สาธารณะ
insert into storage.buckets (id, name, public) values ('slips', 'slips', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('thumbnails', 'thumbnails', true)
  on conflict (id) do nothing;
