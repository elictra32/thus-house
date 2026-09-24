# ทำภาพตัวอย่างก่อน deploy (ไม่ต้องใช้ Supabase จริง)

sandbox ออกเน็ตไป Supabase / Vercel / YouTube / Google Fonts ไม่ได้ จึงรันเว็บในเครื่องกับ **mock Supabase REST** แล้วถ่ายด้วย Playwright

```bash
SKILL=.claude/skills/membership-site-builder
SCRATCH=<scratchpad>

# 1) mock ข้อมูล (แก้ fixture ใน script ให้ตรงกับข้อมูลจริง)
(setsid node $SKILL/scripts/mock-supabase-rest.mjs > /dev/null 2>&1 &)

# 2) build + start ด้วย env ที่ชี้ mock
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x
npx next build > $SCRATCH/build.log 2>&1 && (setsid npx next start -p 3100 > /dev/null 2>&1 &) ; sleep 6

# 3) ถ่ายภาพ (desktop 1440 / laptop 1280 / mobile 390 / light+dark)
node $SKILL/scripts/screenshot.mjs http://127.0.0.1:3100/ $SCRATCH/shots

# 4) ปิด server — ใช้ pgrep/kill ด้วย PID ห้าม pkill -f ที่ pattern ตรงกับ command ของ shell ตัวเอง
kill $(pgrep -f "next-server") $(pgrep -f "mock-supabase-rest") 2>/dev/null
```

จากนั้น
- ดูภาพเองก่อน (Read) หาจุดตัดบรรทัดแปลก/ตัวหนังสือจม/ปุ่มหาย
- รวมภาพเป็น sheet ด้วย PIL แล้วส่ง `SendUserFile` (display: render)
- บอกว่า "ยังไม่ deploy" และบอกข้อจำกัด: ปก YouTube / ฟอนต์ Google ไม่โหลดใน sandbox
- commit + push ไป branch ทำงานได้ (ไม่ขึ้น production) — merge เมื่อเจ้าของตอบตกลงเท่านั้น

ข้อควรระวัง
- Playwright import: `import { chromium } from '<npm root -g>/playwright/index.mjs'`
- element screenshot ของ header จะโดน sticky navbar ทับ → `addStyleTag({content:'nav{position:static!important}'})`
- clip screenshot ต้องใช้ `fullPage: true` + พิกัดรวม scrollY
- สร้างหน้า test ชั่วคราวใน `src/app` แล้วต้องลบ **และลบ `.next`** ไม่งั้น tsc error จาก type ที่ค้าง
