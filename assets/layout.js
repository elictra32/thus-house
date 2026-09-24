// Header, Footer และวงล้อส่วนลด — ใช้ร่วมกันทุกหน้า
(function () {
  document.getElementById("site-header").outerHTML = `
  <header class="site-header">
    <div class="container nav">
      <a class="logo" href="index.html"><span class="logo-mark">T</span><span>Thushouse<small>ACADEMY</small></span></a>
      <button class="menu-btn" aria-label="เมนู" onclick="document.querySelector('.nav-links').classList.toggle('open')">☰</button>
      <nav class="nav-links">
        <a href="index.html#courses">คอร์สเรียน</a>
        <a href="index.html#why">ทำไมต้องเรียนกับเรา</a>
        <a href="index.html#reviews">เสียงผู้เรียน</a>
        <a href="index.html#faq">คำถามที่พบบ่อย</a>
        <div class="nav-actions">
          <a class="btn btn-ghost" href="login.html">เข้าสู่ระบบ</a>
          <a class="btn btn-primary" href="index.html#courses">เริ่มเรียน</a>
        </div>
      </nav>
    </div>
  </header>`;

  document.getElementById("site-footer").outerHTML = `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="logo" href="index.html"><span class="logo-mark">T</span><span>Thushouse<small>ACADEMY</small></span></a>
          <p>บ้านแห่งการเรียนรู้การลงทุนออนไลน์ ที่พาคุณจากมือใหม่สู่มืออาชีพด้วยระบบที่ใช้ได้จริง</p>
        </div>
        <div>
          <h4>คอร์ส</h4>
          <ul>${COURSES.map((c) => `<li><a href="course.html?id=${c.id}">${c.title}</a></li>`).join("")}
          <li><a href="index.html#courses">ดูทั้งหมด</a></li></ul>
        </div>
        <div>
          <h4>ติดต่อ</h4>
          <ul><li><a href="${SITE.lineUrl}" target="_blank" rel="noopener">LINE: ${SITE.line}</a></li><li><a href="#">นโยบายความเป็นส่วนตัว</a></li></ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Thushouse. สงวนลิขสิทธิ์</span>
        <span>เนื้อหาเพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน · การลงทุนมีความเสี่ยง</span>
      </div>
    </div>
  </footer>
  <div class="modal" id="wheel-modal">
    <div class="glass modal-box">
      <button class="modal-close" aria-label="ปิด" onclick="closeWheel()">×</button>
      <h3 style="margin:0">หมุนวงล้อรับส่วนลด 🎁</h3>
      <p class="muted small" style="margin:6px 0 0">หมุนได้ 1 ครั้ง ใช้โค้ดได้ตอนชำระเงิน</p>
      <div class="wheel-wrap"><canvas id="wheel" width="560" height="560"></canvas></div>
      <div id="wheel-result"></div>
      <button class="btn btn-primary btn-block" id="spin-btn" onclick="spinWheel()">หมุนเลย!</button>
    </div>
  </div>`;
})();

// ===== วงล้อส่วนลด =====
const PRIZES = [
  { label: "ลด 5%", pct: 5 }, { label: "ลด 10%", pct: 10 }, { label: "ลด 5%", pct: 5 },
  { label: "ลด 15%", pct: 15 }, { label: "ลด 5%", pct: 5 }, { label: "ลด 10%", pct: 10 },
];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
let wheelDrawn = false;

function drawWheel() {
  const cv = document.getElementById("wheel"), ctx = cv.getContext("2d");
  const r = cv.width / 2, seg = (Math.PI * 2) / PRIZES.length;
  PRIZES.forEach((p, i) => {
    const a = -Math.PI / 2 + i * seg - seg / 2;
    ctx.beginPath(); ctx.moveTo(r, r); ctx.arc(r, r, r, a, a + seg);
    ctx.fillStyle = i % 2 ? "#1a1328" : "#7c3aed"; ctx.fill();
    ctx.save(); ctx.translate(r, r); ctx.rotate(a + seg / 2);
    ctx.fillStyle = i % 2 ? "#c4b5fd" : "#ffffff";
    ctx.font = "600 34px 'Prompt', sans-serif"; ctx.textAlign = "right";
    ctx.fillText(p.label, r - 30, 12); ctx.restore();
  });
  wheelDrawn = true;
}
function showCoupon(code) {
  document.getElementById("wheel-result").innerHTML =
    `<p class="muted small" style="margin:0">โค้ดของคุณ</p><div class="coupon">${code}</div>`;
  const btn = document.getElementById("spin-btn");
  btn.textContent = "เลือกคอร์สเลย"; btn.onclick = () => { closeWheel(); location.href = "index.html#courses"; };
}
function openWheel() {
  document.getElementById("wheel-modal").classList.add("open");
  if (!wheelDrawn) drawWheel();
  const saved = store.get("th_coupon");
  if (saved) showCoupon(saved);
}
function closeWheel() { document.getElementById("wheel-modal").classList.remove("open"); }
function spinWheel() {
  const i = Math.floor(Math.random() * PRIZES.length);
  const deg = 360 * 6 - i * (360 / PRIZES.length);
  document.getElementById("wheel").style.transform = `rotate(${deg}deg)`;
  document.getElementById("spin-btn").disabled = true;
  setTimeout(() => {
    const code = "THUS" + PRIZES[i].pct;
    store.set("th_coupon", code);
    document.getElementById("spin-btn").disabled = false;
    showCoupon(code);
  }, 4600);
}
// โค้ดที่ใช้ได้ → % ส่วนลด
const COUPONS = { THUS5: 5, THUS10: 10, THUS15: 15 };
