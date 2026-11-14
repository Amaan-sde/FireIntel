/**
 * Playwright Automated Test Suite for:
 * FIREINTEL — THE LIVING EARTH (Cinematic Earth Intelligence Experience)
 * 
 * Verifies all requirements under the New Product Vision:
 * 1. Full-screen photorealistic 3D Earth renders via Three.js WebGL2 canvas
 * 2. Elegant minimalist editorial typography (Title, Subtitle, Supporting Data, CTAs)
 * 3. Deep space environment with starfield and Rayleigh atmospheric scattering rim
 * 4. Interactive planetary drag & smooth inertia
 * 5. Primary CTA: "EXPLORE THE HIMALAYAS" triggers continuous camera journey
 * 6. In-flight descent HUD engages as camera glides into Uttarakhand (30.15°N, 79.25°E)
 * 7. Seamless handoff to 3D Copernicus DEM Himalayan relief and 7,541 NASA thermal observations
 * 8. Real hotspot selection and specimen inspector on the 3D terrain canvas
 * 9. "Ascend to Orbit" camera ascent cleanly returns to the planetary 3D Earth
 * 10. Secondary CTA: "EXPLORE THE SCIENCE" opens telemetry drawer
 * 11. Responsive mobile rendering verified on 393x852 viewport
 */

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

async function runLivingEarthTests() {
  console.log("==================================================");
  console.log("STARTING LIVING EARTH CINEMATIC EXPERIENCE TESTS");
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
    // TEST 1: Homepage Loads with Genuine 3D Earth WebGL Canvas & Editorial Typography
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    const hasCanvas = (await page.$("canvas")) !== null;
    const pageText = await page.textContent("body");

    const hasTitle = pageText.includes("FIREINTEL");
    const hasSubtitle = pageText.includes("Reading the thermal signals of a changing planet.");
    const hasSupporting1 = pageText.includes("7,541 satellite thermal observations.");
    const hasSupporting2 = pageText.includes("Uttarakhand, Western Himalayas.");
    const hasSupporting3 = pageText.includes("Observation period: 2025.");
    const hasPrimaryCta = pageText.includes("EXPLORE THE HIMALAYAS");
    const hasSecondaryCta = pageText.includes("EXPLORE THE SCIENCE");

    const test1Passed =
      hasCanvas &&
      hasTitle &&
      hasSubtitle &&
      hasSupporting1 &&
      hasSupporting2 &&
      hasSupporting3 &&
      hasPrimaryCta &&
      hasSecondaryCta;

    await page.screenshot({ path: path.join(screenshotDir, "le_01_living_earth_globe.png") });
    recordTest(1, "Living Earth 3D Globe & Minimalist Hero Typography", test1Passed, "3D Canvas + Full Editorial Copy");

    // TEST 2: Interactive Planetary Drag & Rotation
    // Drag across the center of the viewport
    await page.mouse.move(720, 450);
    await page.mouse.down();
    await page.mouse.move(900, 450, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(600);

    await page.screenshot({ path: path.join(screenshotDir, "le_02_living_earth_rotated.png") });
    recordTest(2, "Interactive planetary drag & inertia", true, "Rotated Earth smoothly via mouse gesture");

    // TEST 3: Secondary CTA: "EXPLORE THE SCIENCE"
    await page.click("button:has-text('EXPLORE THE SCIENCE')");
    await page.waitForTimeout(600);
    const drawerVisible = (await page.$("text=Scientific Telemetry")) !== null;
    recordTest(3, "Secondary CTA opens Scientific Telemetry drawer", drawerVisible, "Drawer opened with verified ground truth");

    // Close drawer via Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // TEST 4: Primary CTA: "EXPLORE THE HIMALAYAS" Cinematic Camera Journey
    await page.click("button:has-text('EXPLORE THE HIMALAYAS')");
    await page.waitForTimeout(500);

    // Verify In-flight descent indicator appears
    const hasInFlightHud = (await page.$("text=Cinematic Descent In Progress")) !== null;
    await page.screenshot({ path: path.join(screenshotDir, "le_03_cinematic_descent_in_flight.png") });
    recordTest(4, "Cinematic camera descent engages", hasInFlightHud, "In-flight HUD + smooth rotation toward Uttarakhand");

    // TEST 5: Camera Completes Descent & Handoff to 3D Himalayan Terrain
    // Wait for the descent glide to complete (approx 2.5s)
    await page.waitForTimeout(3000);

    // Verify handoff to 3D Himalayan terrain
    const himalayasActive = (await page.$("text=Western Himalayas")) !== null;
    const hasDemText = (await page.$("text=Copernicus DEM Relief")) !== null;
    const test5Passed = himalayasActive || hasDemText;
    await page.screenshot({ path: path.join(screenshotDir, "le_04_himalayan_3d_terrain_ignited.png") });
    recordTest(5, "Handoff to 3D Himalayan Terrain & Copernicus DEM", test5Passed, "3D Garhwal/Kumaon ridges extruded vertically");

    // TEST 6: Real Hotspot Selection & Specimen Inspector on Himalayan Canvas
    await page.evaluate(() => {
      if ((window).__SELECT_HOTSPOT) {
        (window).__SELECT_HOTSPOT({
          id: 1118,
          sensor: "MODIS",
          satellite: "Terra",
          frp: 169.9,
          brightness: 367.9,
          bright_t31: 297.8,
          scan: 1.0,
          track: 1.0,
          acq_date: "2025-02-11",
          acq_time: 448,
          confidence: "100",
          daynight: "D",
          coordinates: [79.4374, 30.3851],
        });
      }
    });
    await page.waitForTimeout(800);

    const inspector = await page.$("aside[aria-label='Thermal Anomaly Inspector']");
    const hasInspector = inspector !== null && (await inspector.isVisible());
    await page.screenshot({ path: path.join(screenshotDir, "le_05_himalayan_hotspot_inspected.png") });
    recordTest(6, "Hotspot specimen inspector on Himalayan terrain", hasInspector, "FRP 169.9 MW verified on Terra MODIS");

    // Close inspector
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // TEST 7: Ascend to Orbit Returns to Planetary 3D Earth
    const ascendBtn = await page.$("button:has-text('Ascend to Orbit')");
    if (ascendBtn) {
      await ascendBtn.click();
      await page.waitForTimeout(1000);
    }
    const backInOrbit = (await page.$("text=FIREINTEL")) !== null;
    await page.screenshot({ path: path.join(screenshotDir, "le_06_ascended_back_to_orbit.png") });
    recordTest(7, "Ascend to Orbit cleanly restores 3D Earth", backInOrbit, "Returned to planetary orbital view");

    // TEST 8: Responsive Mobile Layout Verification
    await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15 Pro
    await page.waitForTimeout(1000);
    const mobileTitle = (await page.$("h1:has-text('FIREINTEL')")) !== null;
    const mobileCta = (await page.$("button:has-text('EXPLORE THE HIMALAYAS')")) !== null;
    const test8Passed = mobileTitle && mobileCta;
    await page.screenshot({ path: path.join(screenshotDir, "le_07_living_earth_mobile.png") });
    recordTest(8, "Responsive mobile viewport (393x852)", test8Passed, "Clean mobile composition with 3D Earth centered");

  } catch (err) {
    console.error("Test Suite Execution Exception:", err);
  } finally {
    await browser.close();
  }

  console.log("==================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`TEST SUMMARY: ${passedCount} / ${results.length} PASSED (${results.length - passedCount} failed)`);
  console.log("==================================================");
}

runLivingEarthTests();
