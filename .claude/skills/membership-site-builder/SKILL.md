---
name: membership-site-builder
description: Playbook for building, deploying and iterating on a membership / online-course website (member signup, bank-transfer slip payments approved by admin, video lessons, membership expiry, roles, landing page) on Next.js 14 + Supabase + Vercel, with a GoDaddy domain and Brevo email. Use this whenever the user wants to build, extend, redesign, deploy, fix or hand over a course / membership / "คอร์สเรียนออนไลน์" / "เว็บสมาชิก" site — including the THUS House (thushouse.com) repo — or asks about Supabase/Vercel/GoDaddy/Brevo setup for such a site, even if they only mention one piece (e.g. "ตั้งค่าโดเมน", "อีเมลยืนยันไม่ส่ง", "เพิ่มระบบ role", "ปรับหน้าแรกตาม CI").
---

# Membership Site Builder

Playbook สำหรับทำเว็บคอร์สเรียน / เว็บสมาชิก ตั้งแต่ศูนย์จนขึ้นเว็บจริงและดูแลต่อ
สรุปจากงานจริงของ THUS House of Traders (www.thushouse.com) — ใช้ซ้ำกับโปรเจกต์ใหม่ได้ โดยเปลี่ยนแค่ข้อมูลแบรนด์/ธุรกิจ

## ก่อนเริ่มทุกครั้ง

1. **อ่านความชอบของเจ้าของงาน** — ถ้า repo มี `docs/OWNER_PREFERENCES.md` ให้อ่านก่อนทำอะไร
   ไฟล์นั้นบอกสไตล์ที่ชอบ/ไม่ชอบ วิธีสื่อสาร และสิ่งที่ถูกแก้มาแล้ว (ไม่ต้องให้เขาพูดซ้ำ)
2. **คุยภาษาเดียวกับเจ้าของงาน** (THUS = ภาษาไทย ศัพท์เทคนิคอังกฤษได้) อธิบายแบบคนไม่ใช่โปรแกรมเมอร์
3. **โปรเจกต์ใหม่** → ถามคำถามใน `references/discovery-questions.md` ก่อน อย่าเดาราคา/ชื่อคอร์ส/บัญชีธนาคาร

## Stack ที่ใช้ (และเหตุผล)

| ส่วน | ใช้ | ทำไม |
|---|---|---|
| เว็บ + API | Next.js 14 App Router, TypeScript, Tailwind | หน้าเว็บ + Admin + API อยู่โปรเจกต์เดียว deploy ครั้งเดียว |
| ฐานข้อมูล / Auth / ไฟล์ | Supabase (Postgres + RLS, Auth, Storage) | มี RLS กันข้อมูลรั่วที่ระดับฐานข้อมูล, มี MCP ให้จัดการได้เอง |
| โฮสต์ | Vercel (ผูก GitHub → push main = deploy production) | ทุก PR ที่ merge ขึ้นเว็บอัตโนมัติ |
| โดเมน | GoDaddy (หรือที่ไหนก็ได้) → DNS ชี้ Vercel | |
| อีเมล | Brevo SMTP ผ่าน Supabase Auth (+ Brevo API สำหรับ Admin ส่งประกาศ) | ฟรี 300 ฉบับ/วัน |
| วิดีโอ | **YouTube Unlisted** + เครื่องเล่นคุมเอง (IFrame API, ชั้นบัง) · Drive ยังรองรับ · Bunny Stream ถ้าต้องกันลิงก์หลุดจริง | Private ฝังไม่ได้ · Drive ติดลิมิตคนดูไม่ล็อกอิน |
| ชำระเงิน | โอน + แนบสลิป → Admin อนุมัติ | ไม่ต้องมี payment gateway |
| แจ้งเตือนเจ้าของ | Discord Webhook (`src/lib/discord.ts`) + 🔔 ในเว็บ + badge สีส้มในเมนู Admin | เจ้าของรู้ทันทีโดยไม่ต้องล็อกอิน |
| งานประจำวัน / สำรองข้อมูล | Vercel Cron → `/api/cron/daily` (+ `CRON_SECRET`) · backup JSON.gz → Discord | Hobby ทำ cron ได้วันละครั้ง · Supabase Free ไม่มี backup |

## ลำดับงาน (ทำตามนี้ แล้วติ๊กทีละข้อ)

### 1. Discovery
ถามตาม `references/discovery-questions.md` → จดคำตอบลง `docs/OWNER_PREFERENCES.md` ทันที (ไฟล์นี้คือความจำข้ามรอบ)

### 2. ฐานข้อมูล Supabase
- เขียน `supabase/schema.sql` แบบ **idempotent** (`if not exists`, `drop policy if exists` → `create policy`) ให้รันซ้ำได้
- **ถ้ามีฐานข้อมูลเดิมอยู่แล้ว ตรวจก่อนเสมอ** (`list_tables verbose`, `pg_policies`, `pg_constraint`) — schema เก่ามักมี NOT NULL / CHECK / UNIQUE / policy ที่ขัดกับโค้ดใหม่ และ policy อันตราย (ผู้ใช้แก้ status ตัวเอง / insert purchase ที่ approved เอง)
- ใช้ `apply_migration` สำหรับ DDL, ทดสอบด้วย **DO block ที่จบด้วย `raise exception 'ALL_OK'`** (ทดสอบจริงแล้ว rollback ไม่ทิ้งข้อมูล) — รวมถึงทดสอบ RLS ด้วย `set local role authenticated` + `request.jwt.claims`
- รัน `get_advisors security` ทุกครั้งหลังแก้ schema
- รายละเอียด: `references/infrastructure.md` §Supabase

### 3. สร้างแอป
ฟีเจอร์มาตรฐานและไฟล์ที่เกี่ยวข้อง: `references/features.md`
ตรวจก่อน push ทุกครั้ง: `npx tsc --noEmit && npx next lint` และ `next build` (env ปลอมได้)

### 4. Deploy (Vercel)
- สร้าง project ผูก GitHub repo, ใส่ env ที่ไม่ลับเอง, **service role key ให้เจ้าของใส่เองแบบ Sensitive** (อย่าให้ส่งในแชท)
- Workflow ทุกการแก้: branch ทำงาน → PR → merge → Vercel deploy → ตั้ง `send_later` ~3 นาทีเช็ก `READY` แล้วรายงาน
- รายละเอียด + ข้อผิดพลาดที่เจอจริง: `references/infrastructure.md` §Vercel

### 5. โดเมน
ค่า DNS ให้**คัดลอกจากหน้า Vercel → Domains → View DNS configuration** (ค่าเฉพาะโปรเจกต์) ไม่ใช่ค่ามาตรฐานจากความจำ
ระวัง GoDaddy Website Builder แย่ง A record — รายละเอียด `references/infrastructure.md` §Domain

### 6. อีเมล
Supabase SMTP → Brevo; ต้องปิด Authorized IPs ของ SMTP keys ใน Brevo; มี fallback สมัครได้แม้ส่งอีเมลไม่ได้ + Admin ยืนยันแทน
รายละเอียด `references/infrastructure.md` §Email

### 7. แบรนด์ / หน้าแรก
- ขอไฟล์ CI (โลโก้, สไลด์, สี) → ดึงสีด้วย PIL, ตัดโลโก้พื้นโปร่งใส (`scripts/extract_brand.py`)
- โครงหน้าแรก + หลักการจัดตัวอักษร: `references/design-system.md`

### 8. รอบแก้ดีไซน์ (สำคัญ)
งานที่เจ้าของต้องเห็นด้วยตา → **ทำภาพตัวอย่างให้ดูก่อน deploy** ด้วย mock Supabase + Playwright
(`scripts/mock-supabase-rest.mjs`, `scripts/screenshot.mjs`, วิธีใช้ใน `references/preview-workflow.md`)
ส่งภาพด้วย `SendUserFile` แล้วรอคำว่า "deploy ได้ / จัดไป / ลุย" ค่อย merge

## หลักการทำงานที่ได้ผล

- **แก้ทีละเรื่อง PR ละเรื่อง** — ถ้าเขาไม่ชอบ ย้อนได้ง่าย
- **บอกข้อจำกัดตรงๆ** เช่น Drive กันลิงก์หลุดไม่ได้ 100%, iPhone เต็มจอ iframe ไม่ได้ — เสนอทางแก้จริง (Bunny Stream) พร้อมค่าใช้จ่าย
- **งานใน dashboard ภายนอก (GoDaddy, Brevo, Supabase Auth)** → เขียนขั้นตอนเป็นข้อ ชื่อเมนูตรงตามหน้าจอ ขอภาพหน้าจอเมื่อเขาติด แล้วชี้ปุ่มจากภาพ
- **ตรวจจาก log ก่อนเดา** — ปัญหาอีเมล/สมัครไม่ได้ ดู `query_logs` source `auth_logs` ก่อนเสมอ (เคยเจอ `525 Unauthorized IP address` จาก Brevo)
- เมื่อข้อความผู้ใช้กำกวม (เช่น "จัดไป") ให้ทำตามที่เสนอล่าสุดและบอกให้ชัดว่าตีความว่าอะไร
- ห้ามลบข้อมูลจริง (คลาส/สมาชิก) ถ้ามีการซื้อหรือวิดีโอผูกอยู่ — เช็กก่อนด้วย `not exists`

## ฟีเจอร์ชุดหลังที่เพิ่ม (THUS) — ดูแผนที่ไฟล์ใน `references/features.md`
- กันลิงก์วิดีโอหลุด (ส่งทีละบท + column grant + rate limit + log) · คอมเมนต์/ไลก์ใต้คลิป · ถามผู้สอน
- รหัสสมาชิก/ชื่อเล่น · เลือกผู้รับอีเมล · หน้า Usage & ค่าใช้จ่าย · Discord alerts · cron · backup
- ทุกครั้งที่เพิ่มฟีเจอร์ที่ "สำคัญ" ให้ถามว่าควรแจ้ง Discord ไหม (`notifyDiscord(kind, title, fields, path)`)

## ข้อผิดพลาดที่เคยเจอ (อย่าพลาดซ้ำ)
ดู `references/gotchas.md` — อ่านก่อนแตะ Vercel/Supabase/DNS/อีเมล/การตัดบรรทัดภาษาไทย
