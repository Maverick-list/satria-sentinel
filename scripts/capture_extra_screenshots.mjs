import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("../frontend/node_modules/@playwright/test");
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve("./docs/screenshots");

async function captureExtras() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  
  // 1. Login Modal Screenshot (Desktop)
  const deskCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const deskPage = await deskCtx.newPage();
  await deskPage.goto(BASE_URL, { waitUntil: "networkidle" });
  await deskPage.getByTestId("open-login-modal-btn").click();
  await deskPage.waitForTimeout(500);
  await deskPage.screenshot({ path: path.join(SCREENSHOT_DIR, "00_login_modal_desktop.png") });
  console.log("Captured 00_login_modal_desktop.png");
  await deskCtx.close();

  // 2. Remaining Mobile Screenshots
  const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobPage = await mobCtx.newPage();
  for (const item of [
    { route: "/incidents", name: "05_incidents_mobile.png" },
    { route: "/playbooks", name: "06_playbooks_mobile.png" },
    { route: "/audit-logs", name: "07_audit_logs_mobile.png" },
    { route: "/settings", name: "08_settings_mobile.png" },
  ]) {
    await mobPage.goto(`${BASE_URL}${item.route}`, { waitUntil: "networkidle" });
    await mobPage.waitForTimeout(800);
    await mobPage.screenshot({ path: path.join(SCREENSHOT_DIR, item.name) });
    console.log(`Captured ${item.name}`);
  }
  await mobCtx.close();

  await browser.close();
}

captureExtras().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
