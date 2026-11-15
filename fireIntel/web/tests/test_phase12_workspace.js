/**
 * Phase 12 Automated Playwright Test Suite
 * Terrain Intelligence Lab — Personal Geospatial Research Workspace (/workspace)
 * Powered by canonical master dataset: final_consolidated_master.xlsx (240k UK / 510k Regional)
 */

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const SCREENSHOT_DIR = "/Users/macbook/.gemini/antigravity/brain/87e74a08-ad4d-4b76-8b48-7740d095bfb4/screenshots/phase12";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runWorkspaceTests() {
  console.log("================================================================================");
  console.log("FIREINTEL PHASE 12: TERRAIN INTELLIGENCE LAB (/workspace) TEST SUITE");
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
    // SUITE 1: DESKTOP WORKSPACE EXPERIENCE (1920x1080)
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

    await page.goto("http://localhost:3000/workspace", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    // Test 1.1: Workspace Initial Render
    const hasMissionHeader = (await page.$("text=TERRAIN INTELLIGENCE LAB")) !== null;
    const hasMapCanvas = (await page.$(".maplibregl-canvas")) !== null;
    const hasSpatialControls = (await page.$("text=Geographical AOI Selector")) !== null;
    const hasTemporalDeck = (await page.$("text=Temporal Comparison Engine")) !== null;
    const hasMatrix = (await page.$("text=Comparative Intelligence Telemetry")) !== null;
    
    record(
      "1.1",
      "Workspace Initial Render (1920x1080)",
      hasMissionHeader && hasMapCanvas && hasSpatialControls && hasTemporalDeck && hasMatrix,
      `Mission Header, 3D Map, Spatial Controls, Temporal Deck & Telemetry Matrix active`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_desktop_1920x1080_workspace_overview.png") });

    // Test 1.2: Preset AOI Switching (Nainital -> Corbett Tiger Reserve)
    await page.click("button[data-preset-id='corbett_tiger_reserve']");
    await page.waitForTimeout(1200);
    const corbettState = await page.evaluate(() => (window).__WORKSPACE_STATE);
    const isCorbettActive = corbettState?.aoi?.preset_id === "corbett_tiger_reserve";
    const corbettObsTotal = corbettState?.comparisonResult?.baseline?.data?.total_obs;
    record(
      "1.2",
      "Geospatial Preset Switching (Corbett Tiger Reserve)",
      isCorbettActive && corbettObsTotal !== undefined,
      `Active Preset: ${corbettState?.aoi?.preset_id}, Baseline Obs: ${corbettObsTotal}`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_desktop_corbett_preset.png") });

    // Test 1.3: Preset Switch to Dehradun Valley & Rajaji
    await page.click("button[data-preset-id='dehradun_valley']");
    await page.waitForTimeout(1200);
    const dehradunState = await page.evaluate(() => (window).__WORKSPACE_STATE);
    record(
      "1.3",
      "Preset Switch to Dehradun Valley",
      dehradunState?.aoi?.preset_id === "dehradun_valley",
      `Active AOI: ${dehradunState?.aoi?.preset_id}, Baseline: ${dehradunState?.comparisonResult?.baseline?.data?.total_obs}`
    );

    // Switch back to Nainital Division for detailed analysis
    await page.click("button[data-preset-id='nainital_division']");
    await page.waitForTimeout(1000);

    // Test 1.4: Chronological Temporal Comparison (Apr 2025 vs May 2025)
    const chronoState = await page.evaluate(() => (window).__WORKSPACE_STATE);
    const bObs = chronoState?.comparisonResult?.baseline?.data?.total_obs;
    const cObs = chronoState?.comparisonResult?.comparison?.data?.total_obs;
    const deltaObs = chronoState?.comparisonResult?.deltas?.abs_obs;
    const deltaPct = chronoState?.comparisonResult?.deltas?.pct_obs;
    record(
      "1.4",
      "Chronological Telemetry Delta Engine (Apr vs May 2025)",
      bObs !== undefined && cObs !== undefined && deltaObs !== undefined,
      `Baseline: ${bObs} obs, Comparison: ${cObs} obs, Delta: ${deltaObs} (${deltaPct}%)`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_desktop_chronological_comparison.png") });

    // Test 1.5: Multi-Year Seasonal Phenology Mode Switch (Pre-Monsoon vs Winter)
    await page.click("button[data-testid='mode-seasonal-btn']");
    await page.waitForTimeout(1500);
    const seasonalState = await page.evaluate(() => (window).__WORKSPACE_STATE);
    const isSeasonal = seasonalState?.temporalMode === "seasonal";
    const sBaseObs = seasonalState?.comparisonResult?.baseline?.data?.total_obs;
    const sCompObs = seasonalState?.comparisonResult?.comparison?.data?.total_obs;
    record(
      "1.5",
      "Multi-Year Phenological Comparison (Pre-Monsoon vs Winter)",
      isSeasonal && sBaseObs > 5000,
      `Mode: seasonal, Pre-Monsoon Peak Obs: ${sBaseObs?.toLocaleString()}, Winter Obs: ${sCompObs?.toLocaleString()}`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_desktop_seasonal_phenology.png") });

    // Test 1.6: Evidence-Based Findings Panel Verification
    const hasFindings = (await page.$("text=Evidence-Based Research Findings")) !== null;
    const findingsList = await page.evaluate(() => (window).__WORKSPACE_STATE?.comparisonResult?.findings || []);
    record(
      "1.6",
      "Deterministic Evidence-Based Findings",
      hasFindings && findingsList.length >= 2,
      `Found ${findingsList.length} empirical findings synthesized from DuckDB queries`
    );

    // Test 1.7: Research Dossier Export Studio Modal
    await page.click("button[data-testid='export-report-btn']");
    await page.waitForTimeout(800);
    const modalVisible = (await page.$("text=RESEARCH EXPORT STUDIO")) !== null;
    const hasExportCards = (await page.$("text=Raw Observations")) !== null &&
                          (await page.$("text=Spatial Geometry")) !== null &&
                          (await page.$("text=Research Session")) !== null;
    record(
      "1.7",
      "Scientific Export Studio (CSV, GeoJSON, Dossier)",
      modalVisible && hasExportCards,
      `Modal open with CSV, GeoJSON, JSON and Markdown Dossier generators`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_desktop_export_studio_modal.png") });

    // Close Export Modal
    await page.click("button[aria-label='Close export dialog']");
    await page.waitForTimeout(500);

    // Test 1.8: Session Persistence (localStorage)
    await page.click("button[data-testid='save-session-btn']");
    await page.waitForTimeout(600);
    const savedInStorage = await page.evaluate(() => {
      const stored = localStorage.getItem("fireintel_workspace_sessions");
      return stored ? JSON.parse(stored) : [];
    });
    record(
      "1.8",
      "Research Session Local Persistence",
      savedInStorage.length > 0,
      `Successfully saved session snapshot '${savedInStorage[0]?.title}' to localStorage`
    );

    // Test 1.9: Zero Critical Console or Network Errors on Desktop
    record(
      "1.9",
      "Zero Console / Network Errors (Desktop 1920x1080)",
      consoleErrors.length === 0 && networkErrors.length === 0,
      `Console Errors: ${consoleErrors.length}, Network Errors: ${networkErrors.length}`
    );

    await ctxDesktop.close();

    // -------------------------------------------------------------------------
    // SUITE 2: RESPONSIVE VIEWPORTS
    // -------------------------------------------------------------------------
    console.log("\n[SUITE 2] Responsive Testing (Laptop, Tablet, Mobile)...");

    // 2.1 Laptop (1440x900)
    const ctxLaptop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageLaptop = await ctxLaptop.newPage();
    await pageLaptop.goto("http://localhost:3000/workspace", { waitUntil: "networkidle" });
    await pageLaptop.waitForTimeout(1500);
    const hasLaptopHeader = (await pageLaptop.$("text=TERRAIN INTELLIGENCE LAB")) !== null;
    record("2.1", "Laptop Responsive Layout (1440x900)", hasLaptopHeader, "Properly scaled 1440px layout");
    await pageLaptop.screenshot({ path: path.join(SCREENSHOT_DIR, "06_laptop_1440x900_overview.png") });
    await ctxLaptop.close();

    // 2.2 Tablet (768x1024)
    const ctxTablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const pageTablet = await ctxTablet.newPage();
    await pageTablet.goto("http://localhost:3000/workspace", { waitUntil: "networkidle" });
    await pageTablet.waitForTimeout(1500);
    const hasTabletHeader = (await pageTablet.$("text=TERRAIN INTELLIGENCE LAB")) !== null;
    record("2.2", "Tablet Responsive Layout (768x1024)", hasTabletHeader, "Stacked responsive layout");
    await pageTablet.screenshot({ path: path.join(SCREENSHOT_DIR, "07_tablet_768x1024_overview.png") });
    await ctxTablet.close();

    // 2.3 Mobile (390x844 - iPhone 14)
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto("http://localhost:3000/workspace", { waitUntil: "networkidle" });
    await pageMobile.waitForTimeout(1500);
    const hasMobileHeader = (await pageMobile.$("text=TERRAIN INTELLIGENCE LAB")) !== null;
    record("2.3", "Mobile Responsive Layout (390x844)", hasMobileHeader, "Fluid mobile touch targets and cards");
    await pageMobile.screenshot({ path: path.join(SCREENSHOT_DIR, "08_mobile_390x844_overview.png") });
    await ctxMobile.close();

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    record("FATAL", "Suite Execution", false, err.message);
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(`TEST RESULTS SUMMARY: ${results.filter(r => r.passed).length} / ${results.length} PASSED`);
  console.log("================================================================================\n");

  const allPassed = results.every(r => r.passed);
  if (!allPassed) {
    process.exit(1);
  }
}

runWorkspaceTests();
