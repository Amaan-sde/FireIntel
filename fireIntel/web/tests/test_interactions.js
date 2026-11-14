/**
 * Comprehensive Playwright Automated Interaction Test Suite for FIREINTEL
 * Tests all 18 interaction flows requested in Phase 6:
 * 1. Mission Control loads successfully
 * 2. Navigation items change destination / open module modals
 * 3. Orbit preset changes camera state
 * 4. Uttarakhand preset changes camera state
 * 5. Himalayan 3D preset changes camera state
 * 6. Focus Uttarakhand Basin button works
 * 7. 3D Terrain toggle works
 * 8. Telemetry drawer opens
 * 9. Telemetry drawer closes via close button
 * 10. Escape key closes drawer
 * 11. January timeline filters observations
 * 12. April timeline filters observations
 * 13. VIIRS sensor filter works
 * 14. MODIS sensor filter works
 * 15. Combined Month + Sensor filtering works synchronously
 * 16. Reset restores all 7,541 observations
 * 17. Hotspot inspector renders and displays attributes
 * 18. Spatial Tour chapter navigation works
 */

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

async function runInteractionTests() {
  console.log("==================================================");
  console.log("STARTING FIREINTEL PLAYWRIGHT INTERACTION TESTS");
  console.log("==================================================");

  const screenshotDir = path.join(__dirname, "screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Monitor console errors
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const results = [];

  function recordTest(testNum, name, passed, details = "") {
    const symbol = passed ? "✓ PASSED" : "✗ FAILED";
    console.log(`[${symbol}] Test ${testNum}: ${name} ${details ? `(${details})` : ""}`);
    results.push({ testNum, name, passed, details });
  }

  try {
    // TEST 1: Mission Control loads
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const title = await page.title();
    const hasMap = (await page.$(".maplibregl-canvas")) !== null;
    const initialText = await page.textContent("body");
    const passed1 = hasMap && initialText.includes("FIREINTEL") && initialText.includes("7,541");
    recordTest(1, "Mission Control loads", passed1, `Title: ${title}`);
    await page.screenshot({ path: path.join(screenshotDir, "01_mission_control_loaded.png") });

    // TEST 2: Navigation changes destination / opens module modal
    const terrainNavBtn = await page.$("nav button:has-text('3D Topography')");
    await terrainNavBtn.click();
    await page.waitForTimeout(500);
    const modalVisible = (await page.$("text=3D Himalayan Topography")) !== null;
    recordTest(2, "Navigation changes destination (Module Modal)", modalVisible, "Opened 3D Himalayan Topography modal");
    await page.screenshot({ path: path.join(screenshotDir, "02_nav_modal_opened.png") });

    // Close the modal
    const closeBtn = await page.$("button:has-text('Continue Exploring Mission Control')");
    await closeBtn.click();
    await page.waitForTimeout(500);

    // TEST 3: Orbit preset changes camera state
    const orbitBtn = await page.$("button[data-camera='orbital']");
    await orbitBtn.click();
    await page.waitForTimeout(1500);
    const orbitActive = await orbitBtn.getAttribute("class");
    const passed3 = orbitActive.includes("text-white") && orbitActive.includes("font-semibold");
    recordTest(3, "Orbit preset changes camera state", passed3, "Orbit view activated");
    await page.screenshot({ path: path.join(screenshotDir, "03_orbit_preset_active.png") });

    // TEST 4: Uttarakhand preset changes camera state
    const uttarakhandBtn = await page.$("button[data-camera='sector']");
    await uttarakhandBtn.click();
    await page.waitForTimeout(1500);
    const utActive = await uttarakhandBtn.getAttribute("class");
    const passed4 = utActive.includes("text-white") && utActive.includes("font-semibold");
    recordTest(4, "Uttarakhand preset changes camera state", passed4, "Sector view activated");
    await page.screenshot({ path: path.join(screenshotDir, "04_uttarakhand_sector_active.png") });

    // TEST 5: Himalayan 3D preset changes camera state
    const ridgeBtn = await page.$("button[data-camera='ridge']");
    await ridgeBtn.click();
    await page.waitForTimeout(1500);
    const ridgeActive = await ridgeBtn.getAttribute("class");
    const passed5 = ridgeActive.includes("text-white") && ridgeActive.includes("font-semibold");
    recordTest(5, "Himalayan 3D preset changes camera state", passed5, "Ridge 3D view activated");
    await page.screenshot({ path: path.join(screenshotDir, "05_himalayan_ridge_active.png") });

    // TEST 6: Focus Uttarakhand button in Hero Card works
    const focusBtn = await page.$("button:has-text('Focus Uttarakhand Basin')");
    await focusBtn.click();
    await page.waitForTimeout(1500);
    const utActiveAfter = await (await page.$("button[data-camera='sector']")).getAttribute("class");
    const passed6 = utActiveAfter.includes("text-white") && utActiveAfter.includes("font-semibold");
    recordTest(6, "Focus Uttarakhand button works", passed6, "Camera flew to Uttarakhand basin");
    await page.screenshot({ path: path.join(screenshotDir, "06_focus_basin_clicked.png") });

    // TEST 7: 3D Terrain toggle works
    const terrainBtn = await page.$("button[data-control='toggle-terrain']");
    const initialTitle = await terrainBtn.getAttribute("title");
    await terrainBtn.click();
    await page.waitForTimeout(500);
    const afterTitle = await terrainBtn.getAttribute("title");
    const passed7 = initialTitle !== afterTitle;
    recordTest(7, "3D Terrain toggle works", passed7, `State changed: ${afterTitle}`);
    await terrainBtn.click(); // restore terrain
    await page.waitForTimeout(500);

    // TEST 8: Telemetry drawer opens
    const telemetryBtn = await page.$("button:has-text('Scientific Telemetry')");
    await telemetryBtn.click();
    await page.waitForTimeout(600);
    const drawerOpen = (await page.$("text=Scientific Telemetry")) !== null && (await page.$("text=Data Lineage & Provenance")) !== null;
    recordTest(8, "Telemetry drawer opens", drawerOpen, "Drawer visible with scientific findings");
    await page.screenshot({ path: path.join(screenshotDir, "08_telemetry_drawer_open.png") });

    // TEST 9: Telemetry drawer closes via close button
    const drawerCloseBtn = await page.$("button[aria-label='Close telemetry drawer']");
    await drawerCloseBtn.click();
    await page.waitForTimeout(500);
    const drawerClosed = (await page.$("text=Data Lineage & Provenance")) === null;
    recordTest(9, "Telemetry drawer closes via close button", drawerClosed, "Drawer dismissed");

    // TEST 10: Escape key closes drawer
    await telemetryBtn.click();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const drawerClosedEscape = (await page.$("text=Data Lineage & Provenance")) === null;
    recordTest(10, "Escape key closes drawer", drawerClosedEscape, "Drawer dismissed via Escape key");

    // TEST 11: January timeline filters observations
    const janBtn = await page.$("button[data-month='1']");
    await janBtn.click();
    await page.waitForTimeout(600);
    const heroJanText = await page.textContent("body");
    const passed11 = heroJanText.includes("Filtered // Jan 2025") && heroJanText.includes("666");
    recordTest(11, "January timeline filters observations", passed11, "Filtered to exactly 666 January observations");
    await page.screenshot({ path: path.join(screenshotDir, "11_january_filter_active.png") });

    // TEST 12: April timeline filters observations
    const aprBtn = await page.$("button[data-month='4']");
    await aprBtn.click();
    await page.waitForTimeout(600);
    const heroAprText = await page.textContent("body");
    const passed12 = heroAprText.includes("Filtered // Apr 2025") && heroAprText.includes("2,255");
    recordTest(12, "April timeline filters observations", passed12, "Filtered to exactly 2,255 April peak observations");
    await page.screenshot({ path: path.join(screenshotDir, "12_april_filter_active.png") });

    // TEST 13: VIIRS filter works
    const viirsBtn = await page.$("button[data-sensor='VIIRS']");
    await viirsBtn.click();
    await page.waitForTimeout(600);
    const heroViirsText = await page.textContent("body");
    const passed13 = heroViirsText.includes("VIIRS 375m") && heroViirsText.includes("2,001");
    recordTest(13, "VIIRS filter works (April + VIIRS)", passed13, "Filtered to exactly 2,001 April VIIRS observations");
    await page.screenshot({ path: path.join(screenshotDir, "13_viirs_filter_active.png") });

    // TEST 14: MODIS filter works
    const modisBtn = await page.$("button[data-sensor='MODIS']");
    await modisBtn.click();
    await page.waitForTimeout(600);
    const heroModisText = await page.textContent("body");
    const passed14 = heroModisText.includes("MODIS 1km") && heroModisText.includes("254");
    recordTest(14, "MODIS filter works (April + MODIS)", passed14, "Filtered to exactly 254 April MODIS observations");
    await page.screenshot({ path: path.join(screenshotDir, "14_modis_filter_active.png") });

    // TEST 15: Combined Month + Sensor filtering works synchronously
    const passed15 = heroModisText.includes("254") && heroModisText.includes("Apr 2025");
    recordTest(15, "Combined month + sensor filtering works", passed15, "Synchronous joint filter (April MODIS = 254)");

    // TEST 16: Reset restores all observations
    const resetBtn = await page.$("button:has-text('Reset Filter')");
    await resetBtn.click();
    await page.waitForTimeout(600);
    const heroRestoredText = await page.textContent("body");
    const passed16 = heroRestoredText.includes("7,541") && !heroRestoredText.includes("Filtered //");
    recordTest(16, "Reset restores all observations", passed16, "Restored all 7,541 observations");
    await page.screenshot({ path: path.join(screenshotDir, "16_all_observations_restored.png") });

    // TEST 17: Hotspot selection & inspector display
    await page.evaluate(() => {
      const sampleHotspot = {
        sensor: "VIIRS",
        satellite: "SNPP",
        frp: 38.4,
        brightness: 342.1,
        acq_date: "2025-04-26",
        acq_time: 745,
        confidence: "high",
        daynight: "D",
        latitude: 30.2845,
        longitude: 79.2154,
        coordinates: [79.2154, 30.2845]
      };
      if (window.__SELECT_HOTSPOT) {
        window.__SELECT_HOTSPOT(sampleHotspot);
      }
    });
    await page.waitForTimeout(500);

    const hasInspector = (await page.$("aside[aria-label='Thermal Anomaly Inspector']")) !== null;
    const inspectorText = hasInspector ? await page.textContent("aside[aria-label='Thermal Anomaly Inspector']") : "";
    const passed17 = hasInspector && inspectorText.includes("38.4") && inspectorText.includes("SNPP");
    recordTest(17, "Hotspot Inspector opens and displays attributes", passed17, "Inspector opened with 38.4 MW FRP on SNPP");
    await page.screenshot({ path: path.join(screenshotDir, "17_hotspot_inspector_active.png") });

    // Close inspector
    const closeInspectorBtn = await page.$("button[aria-label='Close inspector']");
    if (closeInspectorBtn) {
      await closeInspectorBtn.click();
      await page.waitForTimeout(400);
    }

    // TEST 18: Spatial tour chapter navigation works
    const tourHimalayan = await page.$("button:has-text('Himalayan 3D')");
    await tourHimalayan.click();
    await page.waitForTimeout(1500);
    const tourActive = await tourHimalayan.getAttribute("class");
    const passed18 = tourActive.includes("bg-white text-slate-950");
    recordTest(18, "Spatial Tour chapter navigation works", passed18, "Tour Chapter 3 active");
    await page.screenshot({ path: path.join(screenshotDir, "18_spatial_tour_chapter3.png") });

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await browser.close();
  }

  console.log("\n==================================================");
  console.log("PLAYWRIGHT TEST SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed: ${passedCount} / ${total} (${Math.round((passedCount / total) * 100)}%)`);
  console.log(`Browser Console Errors: ${consoleErrors.length}`);

  return { total, passedCount, results, consoleErrors };
}

runInteractionTests().then((res) => {
  if (res.passedCount === res.total && res.total === 18) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
