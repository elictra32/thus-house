# Infrastructure: Supabase · Vercel · Domain · Email

## Supabase

### ตั้งค่า
- Project ใหม่: `create_project` (ถามองค์กร/region ก่อน — ไทยใช้ `ap-southeast-1`)
- URL / anon key: `get_project_url`, `get_publishable_keys` (ใช้ legacy `anon` key กับ `@supabase/ssr`)
- **service_role key ดึงผ่าน MCP ไม่ได้** → ให้เจ้าของคัดลอกจาก Project Settings → API Keys → `service_role` (กด Reveal) แล้วใส่ใน Vercel เอง แบบ Sensitive
  - เตือน: key ขึ้นต้น `eyJ...` เหมือน anon — ต้องเลือกตัวที่เขียน service_role
  - เจ้าของเคยวาง key ลงช่อง "Key" (ชื่อตัวแปร) — บอกชัดว่า Key = ชื่อ, Value = ค่า

### Schema ที่ใช้ (ดู `supabase/schema.sql` ของ THUS เป็นต้นแบบ)
ตาราง: `users` (profile + status + role + membership), `classes` (+ `access_days`), `purchases` (+ `expires_at`, สลิป),
`videos`, `watched_videos`, `live_classes`, `notifications`, `admin_logs`, `roles`, `gallery_items`
Storage buckets: `slips` (private, admin ดูผ่าน signed URL), `thumbnails` (public), `gallery` (public)

หลัก RLS:
- ผู้ใช้อ่านได้เฉพาะของตัวเอง, **ไม่มี update policy บน users** (แก้โปรไฟล์ผ่าน API ที่รับแค่ name/phone)
- videos อ่านได้เฉพาะมี purchase approved และยังไม่หมดอายุ (`expires_at is null or > now()`)
- งาน Admin ทั้งหมดผ่าน API server ด้วย service role (ข้าม RLS) + ตรวจสิทธิ์ตาม Role ในโค้ด
- ฟังก์ชัน security definer ที่อ่าน `auth.users` → revoke จาก anon/authenticated, grant ให้ `service_role` เท่านั้น
- trigger `handle_new_user` → revoke execute จาก public/anon/authenticated

### ทดสอบโดยไม่ทิ้งข้อมูล
```sql
do $$ declare uid uuid := gen_random_uuid(); begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
    values (uid, 'test@example.invalid', '{"name":"T"}', 'authenticated', 'authenticated');
  -- ... ทดสอบสิ่งที่ต้องการ ...
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;   -- ทดสอบ RLS ในมุมสมาชิก
  -- select ... ; if ... then raise exception 'FAIL'; end if;
  raise exception 'ALL_OK';        -- ทุกอย่าง rollback
end $$;
```
เห็น `ERROR: ALL_OK` = ผ่าน

### Auth
- Authentication → URL Configuration: Site URL = โดเมนจริง, Redirect URLs = `https://<โดเมน>/**` และ `https://<project>.vercel.app/**`
- ระบบอีเมลฟรีของ Supabase ส่งได้ ~2 ฉบับ/ชม. → ต้องตั้ง SMTP เอง (ดู Email)
- Rate Limits → ปรับ emails/hour หลังตั้ง SMTP

## Vercel

- MCP บางคำสั่งที่ใส่ `teamId` คืน 403 → **ลองเรียกแบบไม่ใส่ teamId** (`get_project`, `create_project`, `create_project_env`, `create_deployment`) ใช้ได้
- `create_git_project` ใช้ไม่ได้ (403) → ใช้ `create_project` พร้อม `gitRepository: {type:"github", repo:"owner/repo"}` + `framework: "nextjs"`
- ถ้ามี project เก่าที่ผูก repo อื่น อย่าไปแตะ — สร้างใหม่
- env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (เจ้าของใส่เอง), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ADMIN_EMAILS`, (`NEXT_PUBLIC_BANK_*`, `BREVO_*` ไม่บังคับ)
- แก้ env แล้วต้อง redeploy: `create_deployment` ด้วย `deploymentId` ของตัวล่าสุด + `target: "production"`
- Hobby plan build ทีละตัว → deploy ติดคิว `QUEUED` เป็นเรื่องปกติ
- เช็กสถานะ: `list_deployments` (projectId, target production) → `READY`
- เข้าเว็บจริงจาก sandbox ไม่ได้ (proxy บล็อก vercel.app / YouTube / Google Fonts / Supabase) → ตรวจผ่าน MCP หรือ mock ในเครื่อง แล้วขอให้เจ้าของเช็กหน้าเว็บจริง

## Domain (GoDaddy)

1. Vercel: `add_project_domain` → `www.<domain>` เป็นหลัก, `<domain>` redirect 308 ไป www
2. เปลี่ยน `NEXT_PUBLIC_SITE_URL` เป็น `https://www.<domain>` แล้ว redeploy
3. GoDaddy → My Products → โดเมน → DNS:
   - A `@` → IP ที่ Vercel แสดง (ปัจจุบันแนะนำ `216.198.79.1`, ค่าเก่า `76.76.21.21` ยังใช้ได้แต่ขึ้นเหลือง "DNS Change Recommended")
   - CNAME `www` → ค่าเฉพาะโปรเจกต์ เช่น `xxxxxxxx.vercel-dns-017.com` (ค่าเก่า `cname.vercel-dns.com`)
   - **ดูค่าจริงจาก Vercel → Domains → View DNS configuration เสมอ**
4. กับดัก GoDaddy:
   - ถ้า A record ขึ้น "WebsiteBuilder Site" = โดเมนถูกผูก Website Builder → ต้องแก้/ลบ record นั้นแล้วใส่ใหม่
   - หน้า "มาเชื่อมต่อกันเลย" (wizard) → ให้ปิด อย่าเลือก "เชื่อมต่อกับเว็บไซต์ GoDaddy"
   - อย่ากดปุ่ม "สร้างเลยตอนนี้" ในหน้า DNS
   - อย่าแตะ NS / SOA / `_domainconnect`
5. TTL 1 ชม. → รอแล้วกด Refresh ใน Vercel; เหลือง = ใช้ได้แต่มีค่าแนะนำใหม่, แดง = ผิด

## Email (Brevo)

- ฟรี 300 ฉบับ/วัน (ส่งประกาศถึงสมาชิกเยอะจะกินโควตาเดียวกับอีเมลยืนยัน)
- ขั้นตอนเจ้าของทำ: Brevo → Senders, Domains → Add domain → **Authenticate automatically** (GoDaddy Domain Connect) → SMTP & API → Generate SMTP key
- Supabase → Authentication → Emails → SMTP Settings: sender `no-reply@<domain>`, host `smtp-relay.brevo.com`, port `587`, user = SMTP login, pass = SMTP key
- **Brevo → Settings → Security → Authorized IPs → "Deactivate for SMTP keys"** — ถ้าไม่ปิด Supabase จะโดน `525 5.7.1 Unauthorized IP address` (IP ของ Supabase เปลี่ยนได้) ชดเชยด้วยเปิด 2FA บน Brevo
- Debug: `query_logs` source `auth_logs` หา `/signup` ที่ error; `auth.users.confirmation_sent_at` เป็น null = ไม่ได้ส่ง
- Fallback ในโค้ด: ส่งอีเมลไม่ได้ (429/SMTP error) → สร้างบัญชีแบบยังไม่ยืนยันด้วย admin API → Admin กด "ยืนยัน" ที่หน้าสมาชิก; login ปฏิเสธบัญชีที่ไม่มี `email_confirmed_at`
- อีเมล Admin สมัครแบบรอ Admin คนอื่นยืนยันเสมอ (กันคนสมัครด้วยอีเมล Admin แล้วได้สิทธิ์)
