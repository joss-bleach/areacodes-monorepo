import puppeteer from "puppeteer";
import { mkdir } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "temporary-screenshots");

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const BASE_URL = process.env.BASE_URL || "http://localhost:4321";

async function screenshot(path = "/", label) {
  const slug = label || path.replace(/\//g, "-").replace(/^-/, "") || "home";
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle2", timeout: 15000 });
    // Wait for reveal animations
    await new Promise((r) => setTimeout(r, 1200));
    const file = resolve(SCREENSHOT_DIR, `${slug}-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`Saved ${file}`);
    await page.close();
  }

  await browser.close();
}

const path = process.argv[2] || "/";
const label = process.argv[3];
screenshot(path, label).catch((err) => {
  console.error(err);
  process.exit(1);
});
