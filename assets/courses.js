// ===== ข้อมูลคอร์สทั้งหมด — แก้ชื่อ ราคา เนื้อหา ได้ที่ไฟล์นี้ไฟล์เดียว =====
const SITE = {
  name: "Thushouse",
  line: "@thushouse", // LINE Official Account
  lineUrl: "https://line.me/R/ti/p/@thushouse",
  bank: { name: "ธนาคารกสิกรไทย", account: "xxx-x-xxxxx-x", owner: "บจก. ธัสเฮาส์" }, // TODO: ใส่บัญชีจริง
};

const COURSES = [
  {
    id: "foundation",
    badge: "สำหรับมือใหม่",
    title: "House Foundation",
    tagline: "วางรากฐานการลงทุนให้แข็งแรง แม้ยังไม่มีพื้นฐาน",
    short: "คอร์สปูพื้นฐานสำหรับมือใหม่ — เข้าใจตลาด อ่านกราฟเป็น และบริหารความเสี่ยงได้ตั้งแต่ไม้แรก",
    price: 3990,
    lessons: 15,
    hours: 8,
    highlights: [
      "เข้าใจกลไกตลาด หุ้น ทองคำ Futures และคริปโต",
      "อ่านกราฟแท่งเทียน แนวรับ–แนวต้าน และเทรนด์",
      "คำนวณขนาดไม้ และวางจุด Stop Loss ทุกออเดอร์",
    ],
    curriculum: [
      { title: "รู้จักตลาด", items: ["ตลาดทำงานอย่างไร", "ประเภทสินทรัพย์", "เปิดบัญชีและเครื่องมือที่ต้องใช้"] },
      { title: "อ่านกราฟให้เป็น", items: ["กราฟแท่งเทียน", "แนวรับ–แนวต้าน", "โครงสร้างราคาและเทรนด์", "Market Cycle"] },
      { title: "บริหารความเสี่ยง", items: ["Position Size", "Stop Loss / Take Profit", "Risk:Reward"] },
      { title: "Mindset", items: ["จิตวิทยาการเทรด", "Trading Journal", "วางแผนก่อนเข้าเทรด"] },
    ],
  },
  {
    id: "master",
    badge: "ระดับสูง",
    title: "House Master",
    tagline: "ยกระดับสู่การเทรดแบบมีระบบอย่างมืออาชีพ",
    short: "คอร์สขั้นสูง — Multi-Timeframe, TFEX, Leverage และการวัดผลพอร์ตด้วยข้อมูลจริง",
    price: 6990,
    lessons: 12,
    hours: 7,
    highlights: [
      "วิเคราะห์ Multiple Timeframe หาจังหวะเข้า–ออก",
      "เทรด TFEX (S50, GO, USD) และใช้ Leverage อย่างมีวินัย",
      "วัดผลพอร์ตด้วย Win rate, Expectancy และ Drawdown",
    ],
    curriculum: [
      { title: "ระบบเทรด", items: ["Multiple Timeframe", "สร้าง Setup ของตัวเอง", "Backtest เบื้องต้น"] },
      { title: "TFEX & Leverage", items: ["กลไก Margin", "S50 / GO / USD Futures", "Leverage อย่างปลอดภัย"] },
      { title: "ขยายพอร์ต", items: ["การเพิ่มโพสิชันแบบมีระบบ", "Hedging เบื้องต้น"] },
      { title: "วิเคราะห์ผลงาน", items: ["Win rate & Expectancy", "Drawdown", "ปรับปรุงระบบจากข้อมูล"] },
    ],
  },
];

const BUNDLE = {
  id: "bundle",
  title: "Complete House Bundle",
  desc: "เรียนครบทั้งสาย ตั้งแต่ศูนย์จนถึงระดับมืออาชีพ ในแพ็กเกจเดียวที่คุ้มที่สุด",
  price: 8990,
};

const REVIEWS = [
  { title: "ปูพื้นฐานครบ เข้าใจง่ายมาก", body: "สอนกระชับ เนื้อๆ เน้นๆ จากที่ไม่รู้อะไรเลย ตอนนี้วางแผนก่อนเข้าเทรดทุกครั้ง", course: "House Foundation" },
  { title: "แนะนำสำหรับคนเริ่มจาก 0", body: "อธิบายละเอียด ตั้งแต่เปิดบัญชีจนวางไม้แรก มีตัวอย่างจริงให้ดูตลอด", course: "House Foundation" },
  { title: "เปลี่ยนวิธีเทรดไปเลย", body: "ได้ระบบที่วัดผลได้จริง รู้แล้วว่าตัวเองเสียเงินตรงไหน ปรับแล้วพอร์ตนิ่งขึ้นมาก", course: "House Master" },
];

const FAQS = [
  ["ต้องมีพื้นฐานมาก่อนไหม", "ไม่จำเป็นสำหรับ House Foundation เพราะเริ่มตั้งแต่พื้นฐาน ส่วน House Master เหมาะกับผู้ที่มีประสบการณ์เทรดมาบ้างแล้ว"],
  ["ชำระเงินยังไงได้บ้าง", "โอนเงินเข้าบัญชีที่กำหนด แล้วแนบสลิปในหน้าชำระเงิน ทีมงานจะตรวจสอบและเปิดสิทธิ์ให้ภายในเวลาทำการ"],
  ["เรียนได้นานแค่ไหน ดูซ้ำได้ไหม", "เรียนซ้ำได้ตลอดชีพ เข้าเรียนได้ทุกเมื่อหลังได้รับสิทธิ์"],
  ["ขอเงินคืนได้ไหม", "คอร์สเป็นสินค้าดิจิทัลที่เข้าถึงได้ทันทีหลังเปิดสิทธิ์ จึงขอสงวนสิทธิ์ไม่คืนเงิน แนะนำให้สอบถามทาง LINE ก่อนตัดสินใจ"],
  ["มีคอมมูนิตี้ให้ถามไหม", "มีครับ ผู้เรียนทุกคนได้เข้ากลุ่มสมาชิก Thushouse เพื่อถาม–ตอบและแลกเปลี่ยนกับทีมสอน"],
];

// ===== helpers =====
const baht = (n) => "฿" + n.toLocaleString("th-TH");
const findItem = (id) => (id === BUNDLE.id ? BUNDLE : COURSES.find((c) => c.id === id));
const bundleFull = () => COURSES.reduce((s, c) => s + c.price, 0);

const ICON = {
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>',
  star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
};

function courseCard(c) {
  return `
  <article class="glass course">
    <div class="course-top">
      <span class="badge">${c.badge}</span>
      <span class="muted small">${c.lessons} บทเรียน · ${c.hours} ชม.</span>
    </div>
    <h3 class="course-title">${c.title}</h3>
    <p class="accent">${c.tagline}</p>
    <p class="muted">${c.short}</p>
    <ul class="checks">${c.highlights.map((h) => `<li>${ICON.check}<span>${h}</span></li>`).join("")}</ul>
    <div class="course-foot">
      <div><div class="price">${baht(c.price)}</div><div class="emerald small">เรียนซ้ำได้ตลอดชีพ</div></div>
      <a class="btn btn-primary" href="course.html?id=${c.id}">ดูรายละเอียด</a>
    </div>
  </article>`;
}
