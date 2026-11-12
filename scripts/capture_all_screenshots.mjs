import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("../frontend/node_modules/@playwright/test");
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve("./docs/screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const PAGES = [
  { route: "/", desk: "01_dashboard_desktop.png", mob: "01_dashboard_mobile.png" },
  { route: "/assets", desk: "02_assets_desktop.png", mob: "02_assets_mobile.png" },
  { route: "/security-events", desk: "03_security_events_desktop.png", mob: "03_security_events_mobile.png" },
  { route: "/detection-correlation", desk: "04_detection_correlation_desktop.png", mob: "04_detection_correlation_mobile.png" },
  { route: "/incidents", desk: "05_incidents_desktop.png", mob: "05_incidents_mobile.png" },
  { route: "/playbooks", desk: "06_playbooks_desktop.png", mob: "06_playbooks_mobile.png" },
  { route: "/audit-logs", desk: "07_audit_logs_desktop.png", mob: "07_audit_logs_mobile.png" },
  { route: "/settings", desk: "08_settings_desktop.png", mob: "08_settings_mobile.png" },
];

async function captureAll() {
  console.log("=== CAPTURING COMPLETE SCREENSHOT SUITE (DESKTOP & MOBILE) ===");
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  // 1. Desktop Context (1440x900)
  const deskCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const deskPage = await deskCtx.newPage();

  // Login modal screenshot
  console.log("Capturing 00_login_modal_desktop.png...");
  await deskPage.goto(BASE_URL, { waitUntil: "networkidle" });
  await deskPage.waitForTimeout(1000);
  await deskPage.getByTestId("open-login-modal-btn").click();
  await deskPage.waitForTimeout(600);
  await deskPage.screenshot({ path: path.join(SCREENSHOT_DIR, "00_login_modal_desktop.png") });
  console.log("✓ 00_login_modal_desktop.png captured");

  // Close login modal by clicking Escape
  await deskPage.keyboard.press("Escape");
  await deskPage.waitForTimeout(400);

  // Capture all desktop pages
  for (const p of PAGES) {
    console.log(`Capturing Desktop: ${p.desk} (${p.route})...`);
    await deskPage.goto(`${BASE_URL}${p.route}`, { waitUntil: "networkidle" });
    await deskPage.waitForTimeout(1200); // ensure recharts and tables hydrate
    await deskPage.screenshot({ path: path.join(SCREENSHOT_DIR, p.desk) });
    console.log(`✓ ${p.desk} captured`);
  }
  await deskCtx.close();

  // 2. Mobile Context (390x844 - iPhone 14)
  const mobCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobPage = await mobCtx.newPage();

  for (const p of PAGES) {
    console.log(`Capturing Mobile: ${p.mob} (${p.route})...`);
    await mobPage.goto(`${BASE_URL}${p.route}`, { waitUntil: "networkidle" });
    await mobPage.waitForTimeout(1000);
    await mobPage.screenshot({ path: path.join(SCREENSHOT_DIR, p.mob) });
    console.log(`✓ ${p.mob} captured`);
  }
  await mobCtx.close();

  await browser.close();
  console.log("=== ALL 17 SCREENSHOTS CAPTURED SUCCESSFULLY ===");
}

captureAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Screenshot capture failed:", err);
    process.exit(1);
  });
