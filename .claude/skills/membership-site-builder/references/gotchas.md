# ข้อผิดพลาดที่เจอจริง (THUS House) และวิธีแก้

## ฐานข้อมูล
- DB เดิมสร้างจาก schema รุ่นเก่า → `create table if not exists` ข้ามตาราง ทำให้ constraint เก่าค้าง:
  CHECK ของ notification type / live status, NOT NULL (name, instructor, message), varchar(255) สั้นกว่า API, `record_id uuid`,
  `unique(user_id, class_id)` ทำให้ส่งสลิปใหม่หลังถูกปฏิเสธ/ต่ออายุไม่ได้ → ใช้ partial unique index เฉพาะ `pending`
- policy เก่าอันตราย: "Users can update own profile" (แก้ status เอง), "Users can create own purchases" (insert approved เอง) → ลบ
- ฟังก์ชันเก่าคืน varchar แต่คอลัมน์เปลี่ยนเป็น text → RETURN QUERY พัง → ลบถ้าไม่ได้ใช้
- `ALTER FUNCTION` ไม่มี `IF EXISTS` → ใช้ DO block วน `pg_proc`

## Auth / อีเมล
- "Email rate limit exceeded" = ระบบอีเมลฟรีของ Supabase (~2/ชม.) → ตั้ง Brevo SMTP + fallback admin confirm
- Brevo `525 5.7.1 Unauthorized IP address` → ปิด Authorized IPs สำหรับ SMTP keys
- สมัครด้วยอีเมล Admin จะไม่มีอีเมลส่ง (ตั้งใจ) → อย่าใช้อีเมล Admin ทดสอบการส่งอีเมล
- ปิด "Confirm email" ชั่วคราว = ใครก็สมัครด้วยอีเมล Admin ได้ → กันด้วยโค้ด (admin email ต้องยืนยันโดย admin)

## Vercel / โดเมน
- MCP คืน 403 เมื่อใส่ teamId → เรียกแบบไม่ใส่
- GoDaddy Website Builder เขียนทับ A record เป็น "WebsiteBuilder Site"
- ป้ายเหลือง "DNS Change Recommended" ไม่ใช่ error และไม่หายเอง ต้องเปลี่ยนเป็นค่าที่ Vercel แนะนำ
- ค่า DNS มาตรฐานจากความจำอาจล้าสมัย → ดูจากหน้า Vercel

## วิดีโอ
- YouTube **Private ฝังบนเว็บอื่นไม่ได้เลย** (ขึ้น Video unavailable) → ต้องใช้ **Unlisted** · เว็บใช้ IFrame API `controls=0` + ชั้นบังทับทั้ง iframe + ปุ่มควบคุมของเว็บเอง (`YouTubeLesson.tsx`) กันกดออกไป YouTube
- iPhone อาจไม่ยอมให้ `playVideo()` จากปุ่มของเว็บในครั้งแรก → fallback เปิดช่องกลางให้แตะปุ่มเล่นของ YouTube
- Google Drive iframe: บอกสถานะเล่น/หยุดไม่ได้, ป้องกันลิงก์หลุดไม่ได้จริง (บังปุ่ม pop-out ได้แค่คนทั่วไป)
- iPhone ไม่รองรับ Fullscreen API กับ element ทั่วไป → fallback ขยายกรอบ `fixed inset-0` โดยไม่ remount iframe
- `document.hasFocus()` ยังเป็น true เมื่อโฟกัสอยู่ใน iframe ลูก → ใช้หยุดนับเวลาเมื่อสลับแอปได้

## ดีไซน์ / ภาษาไทย
- เจ้าของไม่ชอบฟอนต์ Archivo — ใช้ฟอนต์เดิม
- จัดทุกหัวข้อให้อยู่กลาง → ไม่เอา (เอาเฉพาะ Hero)
- ย้ายวิดีโอ Hero ลงล่าง → ไม่เอา (วิดีโออยู่ขวา)
- "เรียนได้ตลอดชีพ" ผิด → "เรียนได้ตลอดอายุสมาชิก"
- ข้อความเขียนเองห้ามแต่ง — ใช้ข้อความที่เจ้าของส่งมาตรงตัว

## เครื่องมือใน sandbox
- `pkill -f "<pattern>"` / `grep [x]yz` ใน loop kill อาจฆ่า shell ตัวเอง (command line มีคำเดียวกัน) → ใช้ `pgrep` แล้ว kill ตาม PID ในคำสั่งแยก
- server เก่าที่ยังรันอยู่จะเสิร์ฟ build เก่า (CSS หาย) → ฆ่าก่อน start ใหม่
