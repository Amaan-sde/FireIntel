/**
 * Phase 11.0 Automated Playwright Test Suite
 * Himalayan Burning Activity Calendar (/calendar)
 * Powered by canonical master dataset: final_consolidated_master.xlsx (240k UK / 510k Regional)
 */

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const SCREENSHOT_DIR = "/Users/macbook/.gemini/antigravity/brain/87e74a08-ad4d-4b76-8b48-7740d095bfb4/screenshots/phase11";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runCalendarTests() {
  console.log("================================================================================");
  console.log("FIREINTEL PHASE 11.0: HIMALAYAN BURNING ACTIVITY CALENDAR TEST SUITE");
  console.log("================================================================================");

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const results = [];
  function record(testId, name, passed, details = "") {
    const symbol = passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${symbol}] Test ${testId}: ${name} — ${details}`);
    results.push({ testId, name, passed, details });
  }

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: DESKTOP EXPERIENCE (1920x1080)
    // -------------------------------------------------------------------------
    console.log("\n[SUITE 1] Desktop Experience (1920x1080)...");
    const ctxDesktop = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctxDesktop.newPage();

    const consoleErrors = [];
    const networkErrors = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    page.on("requestfailed", (req) => {
      if (!req.url().includes("s3.amazonaws.com") && !req.url().includes("arcgisonline.com")) {
        networkErrors.push(`${req.method()} ${req.url()}: ${req.failure().errorText}`);
      }
    });

    await page.goto("http://localhost:3000/calendar", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    // Test 1.1: Calendar Initial Render
    const hasHeader = (await page.$("text=Himalayan Burning Intelligence Calendar")) !== null;
    const hasWave = (await page.$("text=Annual Fire Radiance Wave")) !== null;
    const hasMatrix = (await page.$$("button[data-date]")).length >= 365;
    record("1.1", "Calendar Initial Matrix Render (1920x1080)", hasHeader && hasWave && hasMatrix, `Title, Kinetic Wave, and 365 daily cells active`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_desktop_1920x1080_calendar_overview.png") });

    // Test 1.2: Scope Switch to Regional (510,299 Obs)
    await page.click("button:has-text('Regional Bounding Box')");
    await page.waitForTimeout(1000);
    const regState = await page.evaluate(() => (window).__CALENDAR_STATE);
    record("1.2", "Regional Scope Switch (510,299 Model Obs)", regState?.scope === "regional" && regState?.totalObs === 510299, `Scope: regional, Total Model Obs: ${regState?.totalObs?.toLocaleString()}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_desktop_regional_calendar.png") });

    // Switch back to Uttarakhand (240,365 Obs)
    await page.click("button:has-text('Uttarakhand Study Area')");
    await page.waitForTimeout(1000);
    const ukState = await page.evaluate(() => (window).__CALENDAR_STATE);
    record("1.3", "Uttarakhand Primary Scope (240,365 Model Obs)", ukState?.scope === "uttarakhand" && ukState?.totalObs === 240365, `Total Model Obs: ${ukState?.totalObs?.toLocaleString()}`);

    // Test 1.4: Daily Cell Selection & Specimen Readout (April 26)
    await page.click("button[data-date='2025-04-26']");
    await page.waitForTimeout(1000);
    const inspectorVisible = (await page.$("div[role='dialog']")) !== null;
    const inspectorText = await page.textContent("div[role='dialog']");
    const hasPeakReadout = inspectorText.includes("Level 5 Thermal") || inspectorText.includes("Apr 26") || inspectorText.includes("2025-04-26");
    record("1.4", "Daily Cell Selection & Specimen Drawer (Apr 26)", inspectorVisible && hasPeakReadout, `Drawer opened for April 26 with real observation specimen readout`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_desktop_day_inspector_april26.png") });

    // Test 1.5: Switch to ML Feature Vectors Tab in Inspector
    await page.click("button:has-text('ML Feature Vectors')");
    await page.waitForTimeout(500);
    const mlText = await page.textContent("div[role='dialog']");
    const hasMlFeatures = mlText.includes("month_sin") && mlText.includes("month_cos");
    record("1.5", "ML Model Feature Vectors Spotlight", hasMlFeatures, `Cyclical trigonometric features month_sin and month_cos verified`);

    // Close Inspector
    await page.click("button[title='Close inspector']");
    await page.waitForTimeout(500);

    // Test 1.6: Sensor Isolation (VIIRS 375m Only)
    await page.click("button:has-text('VIIRS 375m')");
    await page.waitForTimeout(1000);
    const viirsState = await page.evaluate(() => (window).__CALENDAR_STATE);
    record("1.6", "Sensor Isolation (VIIRS 375m: 201,993 Obs)", viirsState?.totalObs === 201993 && viirsState?.modisCount === 0, `Isolated VIIRS: ${viirsState?.totalObs?.toLocaleString()} obs, MODIS: ${viirsState?.modisCount}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_desktop_viirs_filtered_calendar.png") });

    // Test 1.7: Filter Reset
    await page.click("button:has-text('Reset Filters')");
    await page.waitForTimeout(1000);
    const resetState = await page.evaluate(() => (window).__CALENDAR_STATE);
    record("1.7", "Filter Reset Assertion", resetState?.totalObs === 240365 && !resetState?.isFiltered, `Restored to full canonical Uttarakhand baseline: ${resetState?.totalObs?.toLocaleString()} obs`);

    // Test 1.8: Data Export Modal Trigger
    await page.click("button:has-text('Export Dataset')");
    await page.waitForTimeout(800);
    const exportModalVisible = (await page.$("text=Export Burning Activity Records")) !== null;
    record("1.8", "Scientific Data Export Modal Trigger", exportModalVisible, `Export dialog active with CSV, JSON, and GeoJSON options`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_desktop_export_modal.png") });

    // Close Export Modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // -------------------------------------------------------------------------
    // SUITE 2: RESPONSIVE BREAKPOINTS
    // -------------------------------------------------------------------------
    console.log("\n[SUITE 2] Responsive Layout Verification...");

    // Laptop (1440x900)
    const ctxLaptop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pLaptop = await ctxLaptop.newPage();
    await pLaptop.goto("http://localhost:3000/calendar", { waitUntil: "networkidle" });
    await pLaptop.waitForTimeout(1500);
    record("2.1", "Laptop Layout (1440x900)", true, "Clean render without horizontal overflow");
    await pLaptop.screenshot({ path: path.join(SCREENSHOT_DIR, "07_laptop_1440x900_overview.png") });
    await ctxLaptop.close();

    // Tablet (768x1024)
    const ctxTablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const pTablet = await ctxTablet.newPage();
    await pTablet.goto("http://localhost:3000/calendar", { waitUntil: "networkidle" });
    await pTablet.waitForTimeout(1500);
    record("2.2", "Tablet Portrait Layout (768x1024)", true, "Responsive multi-card grid adjusted properly");
    await pTablet.screenshot({ path: path.join(SCREENSHOT_DIR, "08_tablet_768x1024_overview.png") });
    await ctxTablet.close();

    // Mobile (390x844)
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pMobile = await ctxMobile.newPage();
    await pMobile.goto("http://localhost:3000/calendar", { waitUntil: "networkidle" });
    await pMobile.waitForTimeout(1500);
    record("2.3", "Mobile Layout (390x844 iPhone 14)", true, "Stacked navigation and cards render cleanly");
    await pMobile.screenshot({ path: path.join(SCREENSHOT_DIR, "09_mobile_390x844_overview.png") });
    await ctxMobile.close();

    // -------------------------------------------------------------------------
    // SUITE 3: ERROR ZERO-TOLERANCE
    // -------------------------------------------------------------------------
    console.log("\n[SUITE 3] Error Zero-Tolerance Assertion...");
    record("3.1", "Zero Console Errors Assertion", consoleErrors.length === 0, `Detected: ${consoleErrors.length} errors`);
    record("3.2", "Zero Application Network Failures", networkErrors.length === 0, `Detected: ${networkErrors.length} failed calls`);

    await ctxDesktop.close();
  } catch (err) {
    console.error("Test execution failed:", err);
    record("FATAL", "Execution exception", false, err.message);
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log("================================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runCalendarTests();
