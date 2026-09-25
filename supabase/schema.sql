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
-- Discord user ID ของ Admin — ใช้ตรวจสิทธิ์ตอนกดปุ่มอนุมัติใน Discord (Head Admin กำหนด)
alter table public.users add column if not exists discord_id text;
create unique index if not exists users_discord_id_key on public.users (discord_id) where discord_id is not null;

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
-- ข้อความสลิปในห้องอนุมัติ Discord (แก้ข้อความ/เอาปุ่มออกเมื่ออนุมัติหรือปฏิเสธแล้ว)
alter table public.purchases add column if not exists discord_message_id text;

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

-- ---------- ล็อกอินได้ทีละเครื่อง (สมาชิกทั่วไป) + รูปโปรไฟล์ ----------
-- active_session = รหัสเครื่องที่ล็อกอินอยู่ (cookie thus_sid) · เครื่องอื่นล็อกอินไม่ได้จนกว่าจะออกจากระบบ
-- หรือเครื่องเดิมไม่ได้ใช้งานเกิน 24 ชม. หรือแอดมินกด "ปลดล็อกอุปกรณ์" · ทีมงาน (role ≠ member) ไม่ล็อก
alter table public.users add column if not exists active_session text;
alter table public.users add column if not exists active_session_seen timestamptz;

create or replace function public.session_check(sid text) returns text
language plpgsql security definer set search_path = public as $$
declare u users;
begin
  if auth.uid() is null or coalesce(sid, '') = '' then return 'none'; end if;
  select * into u from users where id = auth.uid();
  if not found or u.role <> 'member' then return 'ok'; end if;
  if u.active_session = sid then
    if u.active_session_seen is null or u.active_session_seen < now() - interval '5 minutes' then
      update users set active_session_seen = now() where id = u.id;
    end if;
    return 'ok';
  end if;
  if u.active_session is null or u.active_session_seen is null or u.active_session_seen < now() - interval '24 hours' then
    update users set active_session = sid, active_session_seen = now() where id = u.id;
    return 'ok';
  end if;
  return 'busy';
end $$;

create or replace function public.session_release(sid text) returns void
language sql security definer set search_path = public as $$
  update users set active_session = null, active_session_seen = null
   where id = auth.uid() and active_session = sid;
$$;
revoke all on function public.session_check(text) from public, anon;
revoke all on function public.session_release(text) from public, anon;
grant execute on function public.session_check(text) to authenticated;
grant execute on function public.session_release(text) to authenticated;

-- รูปโปรไฟล์ (ย่อในเบราว์เซอร์เหลือ 256px WebP ~10–30KB) · อัปโหลดผ่าน API (service role)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 204800, '{image/webp,image/jpeg,image/png}')
on conflict (id) do update set public = true, file_size_limit = 204800, allowed_mime_types = '{image/webp,image/jpeg,image/png}';

-- ---------- ข้อมูลสมาชิกเพิ่มเติม ----------
alter table public.users add column if not exists birth_date date;             -- วันเกิด (กรอกตอนสมัคร)
alter table public.users add column if not exists address text;                -- ที่อยู่ (ออกใบกำกับภาษี)
alter table public.users add column if not exists trading_markets text[] not null default '{}'; -- เคยเทรดอะไร
alter table public.users add column if not exists trading_years text;          -- ประสบการณ์เทรด (ช่วงปี)
alter table public.users add column if not exists learning_goal text;          -- เป้าหมายในการเรียน
alter table public.users add column if not exists id_card_enc bytea;           -- เลขบัตรประชาชน (เข้ารหัส)
alter table public.users add column if not exists id_card_last4 text;          -- 4 ตัวท้าย (แสดงแบบซ่อน)

-- สมัครใหม่: เก็บวันเกิดจาก metadata ด้วย
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare bd date;
begin
  begin bd := (new.raw_user_meta_data->>'birth_date')::date; exception when others then bd := null; end;
  insert into public.users (id, email, name, phone, nickname, birth_date)
  values (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'nickname', bd)
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- เลขบัตรประชาชน: เข้ารหัสด้วยกุญแจใน Supabase Vault (สร้างในฐานข้อมูล ไม่มีใครเห็นค่า)
-- เรียกได้เฉพาะ service role — API ตรวจสิทธิ์ (เจ้าของบัญชี / Admin สิทธิ์ members) และบันทึก Log ทุกครั้งที่เปิดดู
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'id_card_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'id_card_key', 'กุญแจเข้ารหัสเลขบัตรประชาชน');
  end if;
end $$;

create or replace function public.set_id_card(uid uuid, plain text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare k text := (select decrypted_secret from vault.decrypted_secrets where name = 'id_card_key');
begin
  if plain is null or plain = '' then
    update users set id_card_enc = null, id_card_last4 = null where id = uid;
  else
    update users set id_card_enc = pgp_sym_encrypt(plain, k), id_card_last4 = right(plain, 4) where id = uid;
  end if;
end $$;
create or replace function public.get_id_card(uid uuid) returns text
language sql stable security definer set search_path = public, extensions as $$
  select pgp_sym_decrypt(u.id_card_enc, (select decrypted_secret from vault.decrypted_secrets where name = 'id_card_key'))
    from users u where u.id = uid and u.id_card_enc is not null;
$$;
revoke all on function public.set_id_card(uuid, text) from public, anon, authenticated;
revoke all on function public.get_id_card(uuid) from public, anon, authenticated;
grant execute on function public.set_id_card(uuid, text) to service_role;
grant execute on function public.get_id_card(uuid) to service_role;

-- ---------- 1 คนหลาย Role: users.role = Role หลัก, user_roles = Role เพิ่มเติม (สิทธิ์รวมกัน) ----------
create table if not exists public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role_id text not null references public.roles(id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
alter table public.user_roles enable row level security;
create index if not exists user_roles_role on public.user_roles (role_id);

-- Mentor: ดูแลสมาชิกที่เพิ่มไว้ + จดโน้ตได้
insert into public.roles (id, name, description, permissions, is_system) values
  ('mentor', 'Mentor', 'ดูแลสมาชิกที่รับผิดชอบ จดโน้ตประวัติได้', '{mentor}', false)
on conflict (id) do nothing;

create table if not exists public.mentor_members (
  mentor_id uuid not null references public.users(id) on delete cascade,
  member_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mentor_id, member_id)
);
alter table public.mentor_members enable row level security;
create index if not exists mentor_members_member on public.mentor_members (member_id);

create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.users(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.member_notes enable row level security;
create index if not exists member_notes_member on public.member_notes (member_id, created_at desc);

-- ---------- Log สมาชิก: แต่ละคนทำอะไร (ล็อกอิน, เปิดบทเรียน, คอมเมนต์, ส่งสลิป, แก้โปรไฟล์ ...) เก็บ 180 วัน ----------
create table if not exists public.member_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.member_logs enable row level security;
create index if not exists member_logs_user on public.member_logs (user_id, created_at desc);
create index if not exists member_logs_time on public.member_logs (created_at desc);
-- ตารางด้านบนไม่มี policy = เข้าถึงได้เฉพาะ API ฝั่ง server (service role)
revoke all on public.user_roles, public.mentor_members, public.member_notes, public.member_logs from anon, authenticated;
