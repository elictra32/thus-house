// ถ่ายภาพหน้าเว็บหลายขนาดจอ ทั้งโหมดสว่างและมืด
// ใช้: node screenshot.mjs <url> <outDir> [--dark-only|--light-only]
// ต้องมี playwright แบบ global (npm root -g) และ Chromium ที่ติดตั้งไว้แล้ว
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const [url = "http://127.0.0.1:3100/", outDir = "./shots", flag] = process.argv.slice(2);
const root = execSync("npm root -g").toString().trim();
const { chromium } = await import(`${root}/playwright/index.mjs`);
mkdirSync(outDir, { recursive: true });

const themes = flag === "--dark-only" ? ["dark"] : flag === "--light-only" ? ["light"] : ["light", "dark"];
const sizes = [
  ["desktop", 1440, 900, 1],
  ["laptop", 1280, 800, 1],
  ["mobile", 390, 844, 2],
];

const browser = await chromium.launch();
for (const theme of themes) {
  for (const [name, width, height, dpr] of sizes) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
    await ctx.addInitScript((t) => { try { localStorage.setItem("thus-theme", t); } catch {} }, theme);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
    await page.addStyleTag({ content: "nav{position:static!important}" });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${outDir}/${theme}-${name}-full.png`, fullPage: true });
    const header = await page.$("header");
    if (header) await header.screenshot({ path: `${outDir}/${theme}-${name}-hero.png` });
    await ctx.close();
  }
}
await browser.close();
console.log("saved to", outDir);
