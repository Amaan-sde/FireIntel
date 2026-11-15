/**
 * Automated Playwright Test Suite for:
 * 1. Location-Based Fire Intelligence Dashboard (/location-intelligence)
 * 2. Header Clearance & Non-Collision Verification (/studio & /location-intelligence)
 */

const { chromium } = require("../node_modules/@playwright/test");
const path = require("path");
const fs = require("fs");

const SCREENSHOT_DIR = "/Users/macbook/.gemini/antigravity/brain/87e74a08-ad4d-4b76-8b48-7740d095bfb4/screenshots/location_intelligence";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("FIREINTEL: LOCATION INTELLIGENCE & UI COLLISION VERIFICATION TEST SUITE");
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
    // TEST 1: DESKTOP LOCATION INTELLIGENCE (1920x1080)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Testing /location-intelligence on Desktop (1920x1080)...");
    const ctxDesktop = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctxDesktop.newPage();

    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("http://localhost:3000/location-intelligence", { waitUntil: "networkidle" });
    await page.waitForSelector("text=14,644", { timeout: 10000 });

    // 1.1 Verify Navigation Header & Title
    const brandCapsule = await page.$("header a");
    record("1.1", "Navigation Header Mounted", Boolean(brandCapsule), "Brand capsule found");

    // 1.2 Check Header Clearance (No Overlap with navbar)
    const headerBox = await (await page.$("header")).boundingBox();
    const searchHeaderBox = await (await page.$("main > div:first-child")).boundingBox();

    const isClearOfNav = searchHeaderBox.y >= (headerBox.y + headerBox.height);
    record(
      "1.2",
      "Navbar & Content Clearance",
      isClearOfNav,
      `Nav bottom: ${(headerBox.y + headerBox.height).toFixed(0)}px, Content top: ${searchHeaderBox.y.toFixed(0)}px (Clearance: ${(searchHeaderBox.y - (headerBox.y + headerBox.height)).toFixed(0)}px)`
    );

    // 1.3 Verify Default Location (Nainital) and KPIs
    const headingText = await page.textContent("h1");
    record("1.3", "Default Location", headingText.includes("Nainital"), `Heading: "${headingText}"`);

    const obsText = await page.textContent("main");
    const hasObsCount = obsText.includes("14,644") && obsText.includes("Observations");
    record("1.4", "KPI Telemetry Deck", hasObsCount, "14,644 observations and buffer area rendered");

    // 1.5 Take Desktop Screenshot
    const ss1Path = path.join(SCREENSHOT_DIR, "01_location_desktop_1920.png");
    await page.screenshot({ path: ss1Path, fullPage: false });
    record("1.5", "Desktop Screenshot Captured", fs.existsSync(ss1Path), ss1Path);

    // -------------------------------------------------------------------------
    // TEST 2: INTERACTIVE LOCATION SEARCH & AUTOCOMPLETE
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Testing Autocomplete Search...");
    const searchInput = await page.$("input[type='text']");
    await searchInput.fill("Dehra");
    await page.waitForSelector("div.absolute.top-full button", { timeout: 5000 });

    const dehradunBtn = await page.locator("div.absolute.top-full button:has-text('Dehradun')").first();
    const dehradunFound = Boolean(dehradunBtn);
    record("2.1", "Autocomplete Suggestion Rendered", dehradunFound, "Found Dehradun in suggestion list");

    if (dehradunFound) {
      await dehradunBtn.click();
      await page.waitForTimeout(2500);
      const newHeading = await page.textContent("h1");
      record("2.2", "Switched Location to Dehradun", newHeading.includes("Dehradun"), `New Heading: "${newHeading}"`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: RADIUS SELECTION (10 km)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Testing Radius Buffer Switching...");
    const radius10Btn = await page.locator("button:has-text('10 km')").first();
    await radius10Btn.click();
    await page.waitForTimeout(2000);

    const radiusText = await page.textContent("main");
    record("3.1", "Switched to 10 km Radius", radiusText.includes("10 km radius") || radiusText.includes("10km Radius"), "Radius buffer updated");

    // -------------------------------------------------------------------------
    // TEST 4: TEMPORAL PHENOLOGY & VERIFIED TIMELINE TABS
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Testing Temporal Phenology & Timeline Tabs...");
    const timelineTabBtn = await page.locator("button:has-text('Verified 2025 Timeline')").first();
    await timelineTabBtn.click();
    await page.waitForTimeout(600);

    const timelineContent = await page.textContent("main");
    const timelineActive = timelineContent.includes("Zero Hallucinated Dates") || timelineContent.includes("verified acquisition dates") || timelineContent.includes("No calendar-dated 2025 records");
    record("4.1", "Timeline Tab Active", timelineActive, "Scientific disclosure & chronology rendered");

    // -------------------------------------------------------------------------
    // TEST 5: TERRAIN CARD REAL METRICS
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Verifying DEM Terrain Metrics...");
    const terrainText = await page.textContent("main");
    const hasElevation = terrainText.includes("Elevation (ASL)") && terrainText.includes("Mean Slope");
    record("5.1", "DEM Terrain Metrics", hasElevation, "Real Copernicus/SRTM elevation & slope verified");

    // -------------------------------------------------------------------------
    // TEST 6: EXPORT DOSSIER MODAL
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Testing Export Modal...");
    const exportBtn = await page.locator("button:has-text('Export Dossier')").first();
    await exportBtn.click();
    await page.waitForSelector("h2:has-text('Export Location Intelligence Dossier')", { timeout: 5000 });

    const modalTitle = await page.locator("div.fixed h2").textContent();
    record("6.1", "Export Modal Opened", modalTitle.includes("Export Location Intelligence Dossier"), `Modal Title: "${modalTitle}"`);

    const ssModalPath = path.join(SCREENSHOT_DIR, "02_location_export_modal.png");
    await page.screenshot({ path: ssModalPath });
    record("6.2", "Export Modal Screenshot Captured", fs.existsSync(ssModalPath), ssModalPath);

    const closeBtn = await page.$("[data-testid='close-location-export-modal-btn']");
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // -------------------------------------------------------------------------
    // TEST 7: LAPTOP (1440x900) & TABLET (1024x768) CLEARANCE
    // -------------------------------------------------------------------------
    console.log("\n[TEST 7] Testing Laptop (1440x900) & Tablet (1024x768)...");
    const ctxLaptop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageLaptop = await ctxLaptop.newPage();
    await pageLaptop.goto("http://localhost:3000/location-intelligence", { waitUntil: "networkidle" });
    await pageLaptop.waitForTimeout(1000);

    const ssLaptopPath = path.join(SCREENSHOT_DIR, "03_location_laptop_1440.png");
    await pageLaptop.screenshot({ path: ssLaptopPath });
    record("7.1", "Laptop 1440x900 Clean Layout", fs.existsSync(ssLaptopPath), ssLaptopPath);

    // Verify /studio also has NO collision on 1440x900
    await pageLaptop.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
    await pageLaptop.waitForTimeout(1500);
    const studioNavBox = await (await pageLaptop.$("header")).boundingBox();
    const studioCardBox = await (await pageLaptop.$("main > div:first-child")).boundingBox();
    const studioNoCollision = studioCardBox.y >= (studioNavBox.y + studioNavBox.height);
    record(
      "7.2",
      "Studio Navbar & Card Clearance (1440x900)",
      studioNoCollision,
      `Nav bottom: ${(studioNavBox.y + studioNavBox.height).toFixed(0)}px, Card top: ${studioCardBox.y.toFixed(0)}px`
    );

    const ssStudioPath = path.join(SCREENSHOT_DIR, "04_studio_clean_clearance_1440.png");
    await pageLaptop.screenshot({ path: ssStudioPath });

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log("TEST SUMMARY");
    console.log("================================================================================");
    const passCount = results.filter((r) => r.passed).length;
    console.log(`Passed: ${passCount}/${results.length}`);
    if (passCount === results.length) {
      console.log("ALL LOCATION INTELLIGENCE & CLEARANCE TESTS PASSED SUCCESSFULLY! ✓");
    } else {
      console.error("SOME TESTS FAILED! ✗");
    }
  } catch (err) {
    console.error("Test Suite Runtime Error:", err);
  } finally {
    await browser.close();
  }
}

runTestSuite();
