# Thushouse — Learning Platform

แพลตฟอร์มเรียนออนไลน์ของ Thushouse: หน้าเว็บสมาชิก + Admin Panel ในโปรเจกต์เดียว

- **Next.js 14** (App Router) + React 18 + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL + Auth + Storage) · Deploy บน **Vercel**
- วิดีโอเล่นจาก **Google Drive** · ชำระเงินด้วย **โอน + แนบสลิป → Admin อนุมัติ**
- ธีม ดำ–ม่วง ตาม `thushouse_prototype.html`

## หน้าเว็บ

| สมาชิก | Admin (`/admin`) |
|---|---|
| `/` Landing | `/admin` Dashboard + กราฟรายได้ 30 วัน / สัดส่วนคอร์ส |
| `/login`, `/signup` | `/admin/payments` ตรวจสลิป อนุมัติ / ปฏิเสธ (พร้อมเหตุผล) |
| `/dashboard` คอร์สของฉัน + ความคืบหน้า, Live Class, คอร์สที่ซื้อได้ | `/admin/members` ค้นหา / กรอง / แบ่งหน้า, ดูรายละเอียด, เปลี่ยนสถานะ, ลบ |
| `/classes/[id]` เล่นวิดีโอ + รายการบทเรียน ✓ | `/admin/classes` สร้าง/แก้/ลบคอร์ส + อัปโหลดรูปปก |
| `/payment` เลือกคอร์ส, เลขบัญชี, แนบสลิป (มี preview) | `/admin/classes/[id]/videos` เพิ่ม/แก้/ลบวิดีโอ, ลากเรียงลำดับ |
| `/profile` แก้ชื่อ/เบอร์, ประวัติการซื้อ, ออกจากระบบ | `/admin/live-classes` ตาราง Live (Zoom/Discord/YouTube) |
| 🔔 การแจ้งเตือน (อนุมัติ/ปฏิเสธ/ประกาศ) | `/admin/email` ส่งอีเมล (Brevo) และ/หรือแจ้งเตือนในเว็บ |
| | `/admin/analytics` การเติบโต, รายได้, ความนิยม, Churn, เข้าใช้ล่าสุด |
| | `/admin/logs` Audit log ทุกการกระทำของ Admin |

---

## 1. Setup (เครื่อง local)

```bash
npm install
cp .env.example .env.local   # แล้วใส่ค่าจริง (ดูด้านล่าง)
npm run dev                  # http://localhost:3000
```

### ตั้งค่า Supabase

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. **SQL Editor** → วางไฟล์ [`supabase/schema.sql`](supabase/schema.sql) แล้วกด Run
   - ใช้ `if not exists` ทั้งหมด **รันซ้ำบนฐานข้อมูลที่มีตารางอยู่แล้วได้** — จะเพิ่มเฉพาะคอลัมน์ที่โค้ดต้องใช้
     (`description`, `thumbnail_url`, `category`, `rejection_reason`, `last_login_at` ฯลฯ), RLS policy, trigger และ Storage bucket
3. **Project Settings → API** → คัดลอก URL, `anon` key, `service_role` key มาใส่ `.env.local`
4. **Authentication → URL Configuration** → ตั้ง Site URL เป็นโดเมนเว็บ
   (ถ้าเปิด "Confirm email" สมาชิกต้องกดยืนยันอีเมลก่อนล็อกอิน)

### Environment variables

| ตัวแปร | คำอธิบาย |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL ของโปรเจกต์ Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key — **ใช้เฉพาะฝั่ง server ห้ามเปิดเผย** |
| `NEXT_PUBLIC_SITE_URL` | URL เว็บ (ใช้ในลิงก์ยืนยันอีเมล) |
| `NEXT_PUBLIC_ADMIN_EMAILS` | อีเมล Admin คั่นด้วย `,` |
| `NEXT_PUBLIC_BANK_NAME` / `_ACCOUNT` / `_OWNER` | บัญชีรับโอนที่แสดงในหน้าชำระเงิน |
| `BREVO_API_KEY` (ไม่บังคับ) | ส่งอีเมลจากหน้า Admin — ถ้าไม่ใส่ ส่งได้เฉพาะแจ้งเตือนในเว็บ |
| `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | ผู้ส่ง (ต้องยืนยันโดเมน/อีเมลใน Brevo ก่อน) |

### เข้าใช้ Admin ครั้งแรก

สมัครสมาชิกที่ `/signup` ด้วยอีเมลที่อยู่ใน `NEXT_PUBLIC_ADMIN_EMAILS` (เจ้าของระบบ) → ให้ Admin ที่มีอยู่ยืนยันบัญชี (หรือยืนยันใน Supabase Dashboard) → เมนู **Admin** จะขึ้นที่แถบด้านบน

### Role & สิทธิ์

| Role | ทำอะไรได้ |
|---|---|
| Member | เรียนคอร์สที่ซื้อ (ค่าเริ่มต้นของทุกคน) |
| Admin | Dashboard, อนุมัติการชำระเงิน, จัดการสมาชิก/ยืนยันอีเมล, คอร์ส, Live, ส่งอีเมล, Audit log — **เปลี่ยน Role ไม่ได้** |
| Head Admin | ทุกอย่าง + สร้าง/แก้ Role และเปลี่ยน Role ของผู้อื่น |

- Head Admin สร้าง Role ใหม่ได้ที่ `/admin/roles` โดยติ๊กสิทธิ์ที่ต้องการ · เปลี่ยน Role ของสมาชิกได้ที่หน้ารายละเอียดสมาชิก
- อีเมลใน `NEXT_PUBLIC_ADMIN_EMAILS` = เจ้าของระบบ ได้ทุกสิทธิ์เสมอ เปลี่ยน Role / ระงับ / ลบจากหน้า Admin ไม่ได้ (กันล็อกตัวเองออก)
- บัญชีที่ไม่ได้ active ไม่มีสิทธิ์ Admin · คนที่ไม่มีสิทธิ์ `roles` แก้หรือลบบัญชี Head Admin ไม่ได้
- เพิ่มสิทธิ์ใหม่ในโค้ด: `src/lib/permissions.ts` แล้วใช้กับ `adminRoute("<สิทธิ์>", …)` / `requirePageAdmin("<สิทธิ์>")`

### เพิ่มวิดีโอจาก Google Drive

1. ใน Drive ตั้งแชร์ไฟล์เป็น **"ทุกคนที่มีลิงก์ดูได้"** (ไม่งั้นเล่นบนเว็บไม่ได้)
2. คัดลอกลิงก์ `https://drive.google.com/file/d/<ID>/view` → วางในหน้า Admin → วิดีโอ พร้อมใส่ความยาว
3. ระบบแปลงเป็นลิงก์ `/preview` ให้อัตโนมัติ · จำนวนวิดีโอ/ชั่วโมงของคอร์สคำนวณให้เอง

---

## 2. Deploy บน Vercel

1. Push โค้ดขึ้น GitHub → [vercel.com/new](https://vercel.com/new) → Import repo นี้ (Framework: Next.js ตรวจเจอเอง)
2. **Settings → Environment Variables** → ใส่ทุกตัวจากตารางด้านบน (`NEXT_PUBLIC_SITE_URL` = โดเมน Vercel/โดเมนจริง)
3. Deploy · จากนั้นกลับไปตั้ง Site URL / Redirect URLs ใน Supabase Auth ให้ตรงกับโดเมน

> Vercel จำกัดขนาด request ~4.5MB ระบบจึงจำกัดสลิปไว้ที่ 4MB

---

## 3. API

ทุก endpoint ตอบกลับเป็น JSON · error = `{ "error": "ข้อความ" }` พร้อม status 400/401/403/404/500
ใช้ cookie session ของ Supabase (ล็อกอินผ่าน `/api/auth/login`)

### สมาชิก

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/auth/me` | ผู้ใช้ปัจจุบัน + `isAdmin` |
| POST | `/api/auth/login` | `{ email, password }` · บัญชี suspended → 403 |
| POST | `/api/auth/signup` | `{ name, email, password }` → `{ needsConfirmation }` |
| POST | `/api/auth/logout` | ออกจากระบบ |
| GET | `/api/classes` | คอร์สทั้งหมด (สาธารณะ) |
| GET | `/api/classes/[id]` | รายละเอียดคอร์ส |
| GET | `/api/classes/[id]/videos` | วิดีโอ + รายการที่ดูแล้ว · ไม่มีสิทธิ์ → 403 |
| GET | `/api/user/purchases` | ประวัติการซื้อของตัวเอง |
| PUT | `/api/user/profile` | `{ name?, phone? }` |
| POST | `/api/purchases/upload-slip` | FormData `class_id`, `slip` (PNG/JPG ≤ 4MB) → purchase `pending` |
| POST | `/api/watched/[videoId]` | บันทึกว่าดูแล้ว |
| GET | `/api/notifications` | แจ้งเตือน 30 รายการล่าสุด |
| POST | `/api/notifications/[id]/read` | อ่านแล้ว |

### Admin (ต้องมีสิทธิ์ตาม Role ของ endpoint นั้น ไม่งั้น 403 · ทุกการแก้ไขบันทึกลง `admin_logs`)

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/admin/users?q=&status=&page=` | ค้นหา/กรอง/แบ่งหน้า (20 ต่อหน้า) · `status=unconfirmed` = รอยืนยันอีเมล |
| GET / PUT / DELETE | `/api/admin/users/[id]` | รายละเอียด (+ การซื้อ, จำนวนที่ดูต่อคอร์ส) / แก้ `status,name,phone,role` (`role` ต้องมีสิทธิ์ `roles`) / ลบ |
| POST | `/api/admin/users/[id]/confirm-email` | ยืนยันอีเมลแทนสมาชิก (บัญชีที่สมัครตอนส่งอีเมลยืนยันไม่ได้) |
| GET / POST | `/api/admin/roles` | รายการ Role + จำนวนสมาชิก / สร้าง `{ name, description?, permissions[] }` (สิทธิ์ `roles`) |
| PUT / DELETE | `/api/admin/roles/[id]` | แก้ / ลบ Role ที่สร้างเอง (สมาชิกกลับเป็น Member) |
| GET | `/api/admin/purchases?status=pending\|approved\|rejected\|all` | พร้อม signed URL ของสลิป (อายุ 1 ชม.) |
| POST | `/api/admin/purchases/[id]/approve` | `{ access_days? }` อนุมัติ + ตั้งวันหมดอายุ (ไม่ส่ง = ค่าเริ่มต้นของคอร์ส, `null` = ไม่หมดอายุ) + แจ้งเตือนสมาชิก |
| PUT | `/api/admin/purchases/[id]` | `{ expires_at: "YYYY-MM-DD" \| null }` แก้วันหมดอายุสิทธิ์เรียน |
| POST | `/api/admin/purchases/[id]/reject` | `{ reason }` ปฏิเสธ + แจ้งเตือนสมาชิก |
| GET | `/api/admin/analytics` | ตัวเลขทั้งหมดของ Dashboard/Analytics |
| GET / POST | `/api/admin/classes` | รายการ / สร้าง `{ name, price, description?, instructor?, category?, thumbnail_url?, access_days? }` |
| PUT / DELETE | `/api/admin/classes/[id]` | แก้ไข / ลบ |
| POST | `/api/admin/upload-thumbnail` | FormData `file` → `{ url }` |
| GET / POST | `/api/admin/videos?classId=` | รายการ / เพิ่ม `{ class_id, title, video_url, duration_seconds, description? }` |
| PUT / DELETE | `/api/admin/videos/[id]` | แก้ไข / ลบ |
| PUT | `/api/admin/videos/reorder` | `{ classId, ids: [...] }` |
| GET / POST | `/api/admin/gallery?kind=feedback\|meetup` | รูป Feedback / Meetup · อัปโหลด FormData `kind, file, caption?` (สิทธิ์ `content`) |
| PUT / DELETE | `/api/admin/gallery/[id]` | แก้คำบรรยาย / ลบรูป |
| PUT | `/api/admin/gallery/reorder` | `{ kind, ids: [...] }` |
| GET / POST | `/api/admin/live-classes` | รายการ / สร้าง |
| PUT / DELETE | `/api/admin/live-classes/[id]` | แก้ไข (รวมเปลี่ยน `status`) / ลบ |
| POST | `/api/admin/email/send-bulk` | `{ target: all\|class\|status, classId?, status?, subject, message, notify? }` |
| GET | `/api/admin/logs?action=&page=` | Audit log |

---

## ความปลอดภัย

- เปิด **RLS** ทุกตาราง: สมาชิกเห็นเฉพาะข้อมูลตัวเอง, ดู `videos` ได้เฉพาะคอร์สที่อนุมัติแล้ว, แก้ `status` ตัวเองไม่ได้
- งาน Admin และการอัปโหลดสลิปทำฝั่ง server ด้วย service role หลังตรวจสิทธิ์แล้วเท่านั้น
- สลิปเก็บใน bucket ส่วนตัว · ตรวจชนิดไฟล์จาก magic bytes · ราคาดึงจากฐานข้อมูลเสมอ (ไม่เชื่อค่าจาก browser)
- สถานะ `inactive` / `suspended` ดูวิดีโอไม่ได้ · `suspended` ล็อกอินไม่ได้

### ข้อจำกัดที่ควรรู้

- **ลิงก์ Google Drive**: ไฟล์ต้องแชร์แบบ "ทุกคนที่มีลิงก์" ถึงจะ embed ได้ ผู้ที่ได้ลิงก์ไปจึงเปิดดูนอกเว็บได้
  ถ้าต้องการกันการแชร์ต่อจริงจัง ควรย้ายไปใช้บริการวิดีโอที่มี signed URL (เช่น Bunny Stream, Cloudflare Stream, Mux)
- **การนับว่าดูแล้ว 80%**: Player ของ Drive อยู่ใน iframe ข้ามโดเมน อ่านเวลาเล่นจริงไม่ได้
  ระบบจึงนับเวลาที่เปิดบทเรียนค้างไว้ (ขณะแท็บเปิดอยู่) ครบ 80% ของความยาววิดีโอแล้ว mark ให้อัตโนมัติ
  และมีปุ่ม "ทำเครื่องหมายว่าดูแล้ว" ให้กดเองได้

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
```
