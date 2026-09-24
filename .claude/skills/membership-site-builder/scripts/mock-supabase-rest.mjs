// Mock Supabase REST (PostgREST) สำหรับรันเว็บในเครื่องเพื่อถ่ายภาพตัวอย่าง
// ใช้: node mock-supabase-rest.mjs [port=54329] แล้วตั้ง NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:<port>
// แก้ FIXTURES ให้ตรงกับข้อมูลจริง (ดึงด้วย Supabase MCP execute_sql ได้)
import http from "node:http";

const port = Number(process.argv[2] ?? 54329);

const FIXTURES = {
  classes: [
    { id: "c1", name: "Basic Free", description: "คลาสปรับพื้นฐาน", instructor: null, category: null, price: 5900, videos_count: 2, duration_hours: 1, thumbnail_url: null, access_days: null, created_at: "" },
    { id: "c2", name: "THUS Members Class", description: "หลักสูตร 1 ปีเต็ม", instructor: "คุณโอม ปิยะรัฐ", category: "MEMBERS", price: 54900, videos_count: 0, duration_hours: 0, thumbnail_url: "/brand/thus-member-cover.jpg", access_days: 365, created_at: "" },
  ],
  gallery_feedback: [3, 4, 5, 7, 8, 9, 10, 16, 20, 21, 22].map((n, i) => ({ id: "f" + n, kind: "feedback", image_url: `/gallery/feedback-${String(n).padStart(2, "0")}.jpg`, caption: null, order_index: i })),
  gallery_meetup: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: "m" + n, kind: "meetup", image_url: `/gallery/meetup-${String(n).padStart(2, "0")}.jpg`, caption: null, order_index: n - 1 })),
};

http
  .createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    const url = req.url ?? "";
    let body = [];
    if (url.includes("/gallery_items")) body = url.includes("meetup") ? FIXTURES.gallery_meetup : FIXTURES.gallery_feedback;
    else if (url.includes("/classes")) body = FIXTURES.classes;
    // ตารางอื่น / auth → ค่าว่าง (หน้าเว็บสาธารณะแสดงได้โดยไม่ต้องล็อกอิน)
    res.end(JSON.stringify(body));
  })
  .listen(port, () => console.log(`mock supabase on http://127.0.0.1:${port}`));
