const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

async function capturePhase62Screenshots() {
  console.log("==================================================================");
  console.log("CAPTURING MULTI-DEVICE & SEAMLESS TRANSITION SCREENSHOTS (PHASE 6.2)");
  console.log("==================================================================");

  const screenshotDir = path.join(__dirname, "screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  // 1. Desktop Ultra-HD (1920x1080)
  const desktopContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(screenshotDir, "p62_01_desktop_hero_1920.png") });
  console.log("Captured 1920x1080 desktop hero");

  // 2. Laptop Standard (1440x900)
  const laptopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const laptopPage = await laptopContext.newPage();
  await laptopPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await laptopPage.waitForTimeout(1500);
  await laptopPage.screenshot({ path: path.join(screenshotDir, "p62_02_laptop_hero_1440.png") });
  console.log("Captured 1440x900 laptop hero");

  // 3. Tablet Portrait (768x1024)
  const tabletContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await tabletPage.waitForTimeout(1500);
  await tabletPage.screenshot({ path: path.join(screenshotDir, "p62_03_tablet_portrait_768.png") });
  console.log("Captured 768x1024 tablet portrait");

  // 4. Mobile Viewport (iPhone 14/15 - 390x844)
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: path.join(screenshotDir, "p62_04_mobile_viewport_390.png") });
  console.log("Captured 390x844 mobile viewport");

  // 5. Satellite Modal Inspection
  await laptopPage.click('button:has-text("Suomi-NPP")');
  await laptopPage.waitForTimeout(400);
  await laptopPage.screenshot({ path: path.join(screenshotDir, "p62_05_snpp_satellite_modal.png") });
  console.log("Captured satellite modal");
  await laptopPage.keyboard.press("Escape");
  await laptopPage.waitForTimeout(300);

  // 6. Seamless Descent In-Flight (Act 3 / Act 4)
  await laptopPage.click('button:has-text("EXPLORE THE HIMALAYAS")');
  await laptopPage.waitForTimeout(1800);
  await laptopPage.screenshot({ path: path.join(screenshotDir, "p62_06_inflight_descent_act3.png") });
  console.log("Captured in-flight descent");

  // 7. Himalayan Seamless Handoff Active (Act 7)
  await laptopPage.waitForSelector('[aria-label="Return to Planetary Orbit"]', { timeout: 8000 });
  await laptopPage.waitForTimeout(1000);
  await laptopPage.screenshot({ path: path.join(screenshotDir, "p62_07_himalayan_terrain_seamless.png") });
  console.log("Captured Himalayan terrain view");

  // 8. Ascend to Orbit Transition
  await laptopPage.click('[aria-label="Return to Planetary Orbit"]');
  await laptopPage.waitForTimeout(1200);
  await laptopPage.screenshot({ path: path.join(screenshotDir, "p62_08_ascend_to_orbit_continuity.png") });
  console.log("Captured ascend to orbit transition");

  await browser.close();
  console.log("All Phase 6.2 screenshots captured successfully.");
}

capturePhase62Screenshots();

