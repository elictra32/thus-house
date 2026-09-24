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
alter table public.users add column if not exists nickname text;       -- ชื่อเล่น (บังคับกรอกตอนสมัคร)
alter table public.users add column if not exists member_code text;    -- รหัสสมาชิก (Admin กำหนด)
create unique index if not exists users_member_code_key on public.users (lower(member_code)) where member_code is not null;

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
-- อายุสมาชิกเริ่มต้นของคอร์ส (วัน) · null = ไม่หมดอายุ
alter table public.classes add column if not exists access_days int;

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
-- วันหมดสิทธิ์เรียน · null = ไม่หมดอายุ
alter table public.purchases add column if not exists expires_at timestamptz;

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
alter table public.notifications add column if not exists link text; -- กดแจ้งเตือนแล้วพาไปหน้านี้

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

-- ---------- รูปหน้าเว็บ: Feedback / Meetup ----------
-- image_url = ลิงก์รูปใน bucket gallery หรือไฟล์ใน public/ ของเว็บ (/gallery/...)
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('feedback', 'meetup')),
  image_url text not null,
  caption text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists gallery_kind_idx on public.gallery_items(kind, order_index);
alter table public.gallery_items enable row level security;
drop policy if exists "gallery: public read" on public.gallery_items;
create policy "gallery: public read" on public.gallery_items for select using (true);
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true)
  on conflict (id) do nothing;

-- ---------- Role & สิทธิ์ ----------
-- permissions: dashboard, payments, members, classes, live, email, content, logs, roles (ดู src/lib/permissions.ts)
-- Role ระบบ (is_system) ลบไม่ได้ · member = สมาชิกทั่วไป (ไม่มีสิทธิ์ Admin)
create table if not exists public.roles (
  id text primary key,
  name text not null,
  description text,
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.roles (id, name, description, permissions, is_system) values
  ('member', 'Member', 'สมาชิกทั่วไป เรียนคอร์สที่ซื้อได้', '{}', true),
  ('admin', 'Admin', 'ดูแลงานประจำวัน แต่เปลี่ยน Role ไม่ได้',
    '{dashboard,payments,members,classes,live,email,content,logs,community}', true),
  ('head_admin', 'Head Admin', 'ทำได้ทุกอย่าง รวมถึงสร้าง Role และเปลี่ยน Role ของผู้อื่น',
    '{dashboard,payments,members,classes,live,email,content,logs,roles,community}', true)
on conflict (id) do nothing;
alter table public.roles enable row level security;
-- ไม่มี policy = อ่าน/เขียนได้เฉพาะ API ฝั่ง server (service role)

alter table public.users add column if not exists role text not null default 'member';
do $$ begin
  alter table public.users add constraint users_role_fkey
    foreign key (role) references public.roles(id) on update cascade on delete set default;
exception when duplicate_object then null; end $$;
create index if not exists users_role_idx on public.users(role);

-- ---------- สร้างแถวใน public.users อัตโนมัติเมื่อมีคนสมัคร ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, phone, nickname)
  values (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'nickname')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- ฟังก์ชัน trigger ไม่ควรเรียกผ่าน /rest/v1/rpc ได้
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- บัญชีที่ยังไม่ยืนยันอีเมล (ให้ Admin ยืนยันแทนได้) ----------
-- อ่าน auth.users ได้เฉพาะ service role (API ฝั่ง Admin)
create or replace function public.admin_unconfirmed_user_ids()
returns table (id uuid) language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where u.email_confirmed_at is null;
$$;
revoke execute on function public.admin_unconfirmed_user_ids() from public, anon, authenticated;
grant execute on function public.admin_unconfirmed_user_ids() to service_role;

-- ---------- ปรับฐานข้อมูลเดิม (schema รุ่นก่อน) ให้ตรงกับโค้ด ----------
-- ฐานข้อมูลที่สร้างจาก schema รุ่นแรกมี NOT NULL / CHECK / UNIQUE ที่โค้ดนี้ไม่ใช้ → ผ่อนหรือเปลี่ยนให้ตรง
alter table public.users alter column name drop not null;
alter table public.classes alter column instructor drop not null;
alter table public.live_classes alter column instructor drop not null;
alter table public.videos alter column order_index set default 0;
alter table public.watched_videos add column if not exists created_at timestamptz not null default now();
alter table public.notifications alter column message drop not null;
alter table public.admin_logs alter column table_name drop not null;
-- varchar(255/500) รุ่นเดิมสั้นกว่าที่ API รับ (title ≤ 300) → ใช้ text
alter table public.videos alter column title type text;
alter table public.live_classes alter column title type text;
alter table public.live_classes alter column zoom_link type text;
alter table public.live_classes alter column youtube_live_url type text;
alter table public.live_classes alter column discord_link type text;

-- ประเภทแจ้งเตือนที่โค้ดใช้: payment, payment_approved, payment_rejected, broadcast
alter table public.notifications drop constraint if exists notifications_type_check;

-- สถานะ Live: upcoming | live | ended (รุ่นเดิมใช้ scheduled/cancelled)
alter table public.live_classes drop constraint if exists live_classes_status_check;
update public.live_classes set status = 'upcoming' where status = 'scheduled';
update public.live_classes set status = 'ended' where status = 'cancelled';
alter table public.live_classes alter column status set default 'upcoming';
alter table public.live_classes add constraint live_classes_status_check
  check (status in ('upcoming', 'live', 'ended'));

-- record_id เก็บได้ทั้ง uuid และค่าอื่น
alter table public.admin_logs alter column record_id type text using record_id::text;

-- ฟังก์ชันจาก schema รุ่นเดิม (โค้ดไม่ได้ใช้)
-- get_upcoming_live_classes คืนค่า varchar และกรอง 'scheduled' ซึ่งไม่ตรงกับตารางแล้ว → ลบ
drop function if exists public.get_upcoming_live_classes();
-- ที่เหลือล็อก search_path
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('get_user_purchases', 'get_upcoming_live_classes', 'get_user_class_progress')
  loop
    execute format('alter function %s set search_path = public', f);
  end loop;
end $$;

-- เดิม unique(user_id, class_id) ทำให้ส่งสลิปใหม่หลังถูกปฏิเสธ/ต่ออายุไม่ได้
-- → จำกัดแค่ห้ามมีสลิปรอตรวจ (pending) ซ้ำในคอร์สเดียวกัน
alter table public.purchases drop constraint if exists purchases_user_id_class_id_key;
drop index if exists public.purchases_one_active_idx;
create unique index if not exists purchases_one_pending_idx
  on public.purchases(user_id, class_id) where status = 'pending';

-- policy รุ่นเดิม: ให้ผู้ใช้แก้ status ตัวเอง / สร้าง purchase ที่อนุมัติแล้วเองได้ → ลบทิ้ง
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Classes are visible to all authenticated users" on public.classes;
drop policy if exists "Admins can update purchases" on public.purchases;
drop policy if exists "Admins can view all purchases" on public.purchases;
drop policy if exists "Users can create own purchases" on public.purchases;
drop policy if exists "Users can view own purchases" on public.purchases;
drop policy if exists "Users can view videos of purchased classes" on public.videos;
drop policy if exists "Users can manage own watched videos" on public.watched_videos;
drop policy if exists "Live classes visible to authenticated users" on public.live_classes;
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Only admins can view logs" on public.admin_logs;

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
create policy "users: read own" on public.users for select using ((select auth.uid()) = id);
-- ไม่มี policy update: การแก้โปรไฟล์ทำผ่าน API (แก้ได้แค่ name/phone) เพื่อกันผู้ใช้แก้ status ตัวเอง
drop policy if exists "users: update own" on public.users;

drop policy if exists "classes: public read" on public.classes;
create policy "classes: public read" on public.classes for select using (true);

drop policy if exists "purchases: read own" on public.purchases;
create policy "purchases: read own" on public.purchases for select using ((select auth.uid()) = user_id);

-- ดูรายการวิดีโอได้เฉพาะคอร์สที่ซื้อ ได้รับอนุมัติ และยังไม่หมดอายุ
drop policy if exists "videos: purchased only" on public.videos;
create policy "videos: purchased only" on public.videos for select using (
  exists (
    select 1 from public.purchases p
    where p.class_id = videos.class_id and p.user_id = (select auth.uid()) and p.status = 'approved'
      and (p.expires_at is null or p.expires_at > now())
  )
);

drop policy if exists "watched: own" on public.watched_videos;
create policy "watched: own" on public.watched_videos for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "live: members read" on public.live_classes;
create policy "live: members read" on public.live_classes for select using ((select auth.role()) = 'authenticated');

drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications for select using ((select auth.uid()) = user_id);
drop policy if exists "notifications: update own" on public.notifications;
create policy "notifications: update own" on public.notifications for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- admin_logs: ไม่มี policy = ผู้ใช้ทั่วไปอ่าน/เขียนไม่ได้เลย

-- ---------- Storage ----------
-- slips = ส่วนตัว (Admin ดูผ่าน signed URL), thumbnails = สาธารณะ
insert into storage.buckets (id, name, public) values ('slips', 'slips', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('thumbnails', 'thumbnails', true)
  on conflict (id) do nothing;

-- ---------- ป้องกันลิงก์วิดีโอหลุด ----------
-- สมาชิกอ่านรายการบทเรียนได้ แต่อ่านคอลัมน์ video_url ไม่ได้ — ขอลิงก์ทีละบทผ่าน /api/videos/[id]/source (service role)
alter table public.videos add column if not exists thumbnail_url text;
revoke select on public.videos from anon, authenticated;
grant select (id, class_id, title, description, duration_seconds, thumbnail_url, order_index, created_at) on public.videos to authenticated;

-- ประวัติขอลิงก์วิดีโอ (ใช้จำกัดจำนวน + แจ้งเตือน Admin) — เข้าถึงได้เฉพาะ service role
create table if not exists public.video_access_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  video_id uuid references public.videos(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  blocked boolean not null default false,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists video_access_logs_user_time on public.video_access_logs (user_id, created_at desc);
create index if not exists video_access_logs_time on public.video_access_logs (created_at desc);
alter table public.video_access_logs enable row level security;
revoke all on public.video_access_logs from anon, authenticated;

-- ---------- คอมเมนต์ใต้คลิป / กดไลก์ / ข้อความถึงผู้สอน ----------
-- เข้าถึงผ่าน API (service role) เท่านั้น — API ตรวจสิทธิ์เข้าเรียนเอง
create table if not exists public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.lesson_comments(id) on delete cascade, -- ตอบกลับ (ชั้นเดียว)
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists lesson_comments_video on public.lesson_comments (video_id, created_at);
create index if not exists lesson_comments_parent on public.lesson_comments (parent_id);

create table if not exists public.lesson_comment_likes (
  comment_id uuid not null references public.lesson_comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.video_likes (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

create table if not exists public.instructor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'new' check (status in ('new', 'read', 'replied')),
  reply text,
  replied_by text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists instructor_messages_user on public.instructor_messages (user_id, created_at desc);
create index if not exists instructor_messages_status on public.instructor_messages (status, created_at desc);

alter table public.lesson_comments enable row level security;
alter table public.lesson_comment_likes enable row level security;
alter table public.video_likes enable row level security;
alter table public.instructor_messages enable row level security;
revoke all on public.lesson_comments, public.lesson_comment_likes, public.video_likes, public.instructor_messages from anon, authenticated;

-- สิทธิ์ community (ตอบ/ลบคอมเมนต์ + ตอบข้อความถึงผู้สอน) ให้ Role ระบบเดิม
update public.roles set permissions = array_append(permissions, 'community')
where id in ('admin', 'head_admin') and not ('community' = any(permissions));

-- ---------- หน้า Admin → Usage ----------
-- ขนาดฐานข้อมูล / ไฟล์ / จำนวนผู้ใช้ — เรียกได้เฉพาะ service role
create or replace function public.admin_usage()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', (select coalesce(sum((o.metadata->>'size')::bigint), 0) from storage.objects o),
    'storage_by_bucket', (
      select coalesce(json_object_agg(x.bucket_id, x.bytes), '{}'::json)
      from (select o.bucket_id, sum((o.metadata->>'size')::bigint) as bytes from storage.objects o group by o.bucket_id) x
    ),
    'auth_users', (select count(*) from auth.users),
    'mau', (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '30 days'),
    'rows', (
      select coalesce(json_object_agg(s.relname, s.n_live_tup), '{}'::json)
      from pg_catalog.pg_stat_user_tables s where s.schemaname = 'public'
    )
  );
$$;
revoke execute on function public.admin_usage() from public, anon, authenticated;
grant execute on function public.admin_usage() to service_role;

-- ---------- ประสิทธิภาพ ----------
create index if not exists instructor_messages_class on public.instructor_messages (class_id);
create index if not exists lesson_comment_likes_user on public.lesson_comment_likes (user_id);
create index if not exists lesson_comments_user on public.lesson_comments (user_id, created_at desc);
create index if not exists video_access_logs_class on public.video_access_logs (class_id);
create index if not exists video_access_logs_video on public.video_access_logs (video_id);
create index if not exists video_likes_user on public.video_likes (user_id);
create index if not exists notifications_user_time on public.notifications (user_id, created_at desc);
-- index ซ้ำจาก schema รุ่นเก่า (มีตัวที่เหมือนกันอยู่แล้ว)
drop index if exists public.idx_purchases_status;
drop index if exists public.idx_purchases_user_id;
drop index if exists public.idx_videos_order_index;
drop index if exists public.idx_watched_videos_user_id;
