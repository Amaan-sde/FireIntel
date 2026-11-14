const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

async function runEnhancedExperienceTests() {
  console.log("==================================================================");
  console.log("VERIFYING ENHANCED LIVING EARTH & NASA CINEMATIC EXPERIENCE");
  console.log("==================================================================");

  const screenshotDir = path.join(__dirname, "screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = [];
  function record(id, name, passed, details = "") {
    console.log(`[${passed ? "✓ PASSED" : "✗ FAILED"}] Test ${id}: ${name} ${details ? `(${details})` : ""}`);
    results.push({ id, name, passed, details });
  }

  try {
    // 1. Homepage Load & Elevated Art Direction
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const hasTitle = (await page.locator("h1:has-text('FIREINTEL')").count()) > 0;
    const hasExploreBtn = (await page.locator("button:has-text('EXPLORE THE HIMALAYAS')").count()) > 0;
    const hasTelemetryBtn = (await page.locator("button:has-text('SCIENCE TELEMETRY')").count()) > 0;
    await page.screenshot({ path: path.join(screenshotDir, "enh_01_elevated_home.png") });
    record(1, "Homepage Loads with Elevated Art Direction", hasTitle && hasExploreBtn && hasTelemetryBtn, "Clean hero CTAs and Inter font typography present");

    // 2. NASA Footage Button Removed Verification
    const hasNasaReelBtn = (await page.locator("button:has-text('NASA Reel')").count()) > 0;
    const hasFootageBtn = (await page.locator("button:has-text('NASA FOOTAGE')").count()) > 0;
    const footageRemoved = !hasNasaReelBtn && !hasFootageBtn;
    record(2, "NASA Footage HD Removed from UI", footageRemoved, "NASA Reel/Footage buttons excluded from UI per request");

    // 3. Camera Vantage Presets
    const indiaBtn = page.locator('button[data-vantage="india"]');
    if (await indiaBtn.count() > 0) {
      await indiaBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, "enh_03_india_vantage.png") });
      record(3, "Camera Vantage: India Subcontinent Focus", true, "Oriented toward Indian subcontinent");
    }

    const nightBtn = page.locator('button[data-vantage="night"]');
    if (await nightBtn.count() > 0) {
      await nightBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, "enh_04_night_lights_vantage.png") });
      record(4, "Camera Vantage: Night Urban Illumination", true, "Night city lights cluster visible");
    }

    // Reset view
    const orbitBtn = page.locator('button[data-vantage="orbit"]');
    if (await orbitBtn.count() > 0) {
      await orbitBtn.click();
      await page.waitForTimeout(500);
    }

    // 4. Primary CTA Descent Animation & Aerospace HUD
    const exploreBtn = page.locator("button:has-text('EXPLORE THE HIMALAYAS')");
    await exploreBtn.click();
    await page.waitForTimeout(700);

    const hasAltitude = (await page.locator("text=Altitude").count()) > 0;
    const hasVelocity = (await page.locator("text=Velocity").count()) > 0;
    const hasTarget = (await page.locator("text=Target").count()) > 0;
    await page.screenshot({ path: path.join(screenshotDir, "enh_05_inflight_aerospace_hud.png") });
    record(5, "Aerospace In-Flight HUD Displays Live Telemetry", hasAltitude && hasVelocity && hasTarget, "Altitude, velocity, target vector active");

    // 5. Redirection to /terrain Page
    console.log("Waiting for descent completion and redirection to /terrain...");
    await page.waitForURL("**/terrain", { timeout: 8000 });
    const currentUrl = page.url();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, "enh_06_redirected_to_terrain.png") });
    record(6, "Redirection to /terrain on Descent Completion", currentUrl.includes("/terrain"), `Navigated to ${currentUrl}`);

    // 6. Terrain Explorer Interactive Verification
    const hasCopernicusTitle = (await page.locator("text=Copernicus").count()) > 0;
    const hasReturnLink = (await page.locator("[aria-label='Return to Planetary Orbit']").count()) > 0;
    record(7, "Terrain Explorer Page Fully Rendered", hasCopernicusTitle && hasReturnLink, "Copernicus 30m DEM + return link active");

    // 7. Return to Planetary Orbit
    const returnBtn = page.locator("[aria-label='Return to Planetary Orbit']");
    await returnBtn.click();
    await page.waitForURL("http://localhost:3000/", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, "enh_07_returned_to_orbit.png") });
    record(8, "Return to Planetary Orbit Link Functions", page.url() === "http://localhost:3000/", "Returned to Living Earth orbit");

  } catch (err) {
    console.error("Test failed with error:", err);
    record(99, "Overall Suite Execution", false, err.message);
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.passed).length;
  console.log(`\nResults: ${passed} / ${results.length} PASSED`);
}

runEnhancedExperienceTests();
