# ฟีเจอร์มาตรฐาน (และที่อยู่ในโค้ด THUS)

ใช้เป็น checklist ว่าเว็บคอร์สควรมีอะไร และเป็นแผนที่โค้ดเวลาแก้ repo THUS

## สมาชิก
| ฟีเจอร์ | ไฟล์หลัก | หมายเหตุ |
|---|---|---|
| สมัคร / ล็อกอิน | `src/app/api/auth/signup`, `login`, `src/app/signup/SignupForm.tsx` | fallback เมื่อส่งอีเมลไม่ได้ + ห้ามล็อกอินถ้ายังไม่ยืนยัน |
| Dashboard | `src/app/(member)/dashboard/page.tsx` | คอร์สของฉัน + progress + วันหมดอายุ, Live, คอร์สที่ซื้อได้/ต่ออายุ |
| หน้าเรียน | `src/app/(member)/classes/[id]/LessonView.tsx`, `src/components/VideoPlayer.tsx`, `YouTubeLesson.tsx` | YouTube: IFrame API `controls=0` + ชั้นบัง + ปุ่มของเว็บ (เล่น/เลื่อน/±10/ความเร็ว/CC/เต็มจอ) นับเวลาเฉพาะตอนเล่น · Drive: iframe + บังปุ่ม pop-out · key ของ element พี่น้องต้องไม่ซ้ำ |
| ลิงก์วิดีโอทีละบท | `src/app/api/videos/[id]/source`, `LESSON_COLUMNS` ใน `class-access.ts` | DB: `grant select (…ไม่มี video_url)` ให้ authenticated · log `video_access_logs` · เกิน 30 บท/ชม. → 429 + แจ้ง Admin/Discord |
| คอมเมนต์ + ไลก์ | `src/components/LessonComments.tsx`, `/api/videos/[id]/comments`, `/api/videos/[id]/like`, `/api/comments/[id]` | ตอบ 1 ชั้น · แจ้งทุกคนในกระทู้ · deep link `?v=<id>#comment-<id>` ไฮไลต์ส้ม · ดึงผู้เขียนแยก (ห้าม embed users) |
| ถามผู้สอน | `src/app/(member)/messages`, `/api/messages`, `src/app/admin/messages` | สิทธิ์ `community` ตอบ/ลบ |
| สิทธิ์เรียน | `src/lib/class-access.ts`, `isActivePurchase` ใน `src/lib/utils.ts` | approved + ยังไม่หมดอายุ (ตรวจทั้งในโค้ดและ RLS) |
| ชำระเงิน | `src/app/(member)/payment`, `src/app/api/purchases/upload-slip` | ตรวจ magic bytes PNG/JPG, ≤4MB (Vercel จำกัด ~4.5MB), ราคาเอาจาก DB |
| โปรไฟล์ | `src/app/(member)/profile` | แก้ชื่อ/ชื่อเล่น/เบอร์, แสดงรหัสสมาชิก, ประวัติซื้อ + วันหมดอายุ |
| แจ้งเตือน 🔔 | `src/components/NotificationBell.tsx`, `/api/notifications` (+ `read-all`) | `notifications.link` กดแล้วพาไปหน้า · poll 60 วิ · badge ส้ม |

## Admin (`/admin`, สิทธิ์ตาม Role)
| ฟีเจอร์ | ไฟล์ | สิทธิ์ |
|---|---|---|
| Dashboard / Analytics | `src/app/admin/page.tsx`, `analytics` | `dashboard` |
| อนุมัติสลิป + กำหนดอายุสมาชิก | `src/app/admin/payments`, `/api/admin/purchases/*` | `payments` |
| สมาชิก + ยืนยันอีเมลแทน + แก้วันหมดอายุ + เปลี่ยน Role | `src/app/admin/members`, `/api/admin/users/*` | `members` (+ `roles` สำหรับเปลี่ยน Role) |
| คอร์ส / วิดีโอ (ลากเรียง) | `src/app/admin/classes` | `classes` |
| Live Class | `src/app/admin/live-classes` | `live` |
| ส่งอีเมล/ประกาศ | `src/app/admin/email` | `email` |
| รูปหน้าเว็บ (Feedback/Meetup) | `src/app/admin/gallery` | `content` |
| Audit log | `src/app/admin/logs` | `logs` |
| Role & สิทธิ์ | `src/app/admin/roles` | `roles` |
| ข้อความถึงผู้สอน / ลบคอมเมนต์ | `src/app/admin/messages` | `community` |
| Usage & ค่าใช้จ่าย + ปุ่มสำรองข้อมูล | `src/app/admin/usage`, `src/lib/usage-plans.ts`, RPC `admin_usage()` | `dashboard` (ปุ่ม backup = `roles`) |
| ตัวเลขส้มบนเมนู | `src/components/admin/AdminNav.tsx`, `/api/admin/badges` | ตามสิทธิ์ · refresh หลัง action (event `admin-badges`) |
| Discord / cron / backup | `src/lib/discord.ts`, `src/app/api/cron/daily`, `src/lib/backup.ts`, `vercel.json` | env: `DISCORD_WEBHOOK_URL`, `DISCORD_BACKUP_WEBHOOK_URL`, `CRON_SECRET` |

ระบบ Role: `src/lib/permissions.ts` (รายการสิทธิ์), `getPermissions` ใน `src/lib/auth.ts`,
ทุก API admin ใช้ `adminRoute("<สิทธิ์>", handler)`, หน้า server ใช้ `requirePageAdmin("<สิทธิ์>")`
- เพิ่มสิทธิ์ใหม่: เพิ่มใน `PERMISSIONS` → ใช้ใน route → migration เพิ่มให้ role admin/head_admin → เพิ่มเมนูใน `AdminNav`
- เจ้าของ (`NEXT_PUBLIC_ADMIN_EMAILS`) ได้ทุกสิทธิ์เสมอ แก้/ระงับ/ลบจากหน้า Admin ไม่ได้

## หน้าเว็บสาธารณะ
| ส่วน | ไฟล์ |
|---|---|
| หน้าแรก (Hero + วิดีโอ, ตัวเลข, Highlights, Benefits, Meetup slideshow, Feedback, Curriculum, Classes, CTA) | `src/app/page.tsx` |
| หน้า Feedback | `src/app/feedback/page.tsx`, `src/components/FeedbackGallery.tsx` |
| วิดีโอแบบกดเล่นเอง | `src/components/YouTubeLite.tsx` |
| สไลด์โชว์ | `src/components/MeetupSlideshow.tsx` |
| Dark mode | `ThemeToggle.tsx`, CSS vars ใน `globals.css`, script ใน `layout.tsx` |
| ข้อความหลายบรรทัดแบบกำหนดจุดตัด | `Lines` ใน `src/app/page.tsx` |

## ฟีเจอร์ที่ควรเสนอในอนาคต
- ย้ายวิดีโอไป Bunny Stream (signed URL + รู้สถานะเล่น/หยุดจริง + เรียนต่อจากจุดเดิม)
- ชำระเงินผ่าน PromptPay QR / payment gateway
- หน้าเสียงจากสมาชิกแบบข้อความ (ไม่ใช่แค่รูป)
