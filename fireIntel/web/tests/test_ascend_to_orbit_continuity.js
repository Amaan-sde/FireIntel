const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

async function recordAscentFrames() {
  console.log("==================================================================");
  console.log("RECORDING FRAME-BY-FRAME ASCENT TO ORBIT (VERIFY ZERO BLACK FRAMES)");
  console.log("==================================================================");

  const framesDir = path.join(__dirname, "ascent_frames");
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Skip directly to Himalayas
    const exploreBtn = page.locator('button:has-text("EXPLORE THE HIMALAYAS")');
    await exploreBtn.click();
    await page.waitForTimeout(300);

    const skipBtn = page.locator('button:has-text("Skip to Himalayas")');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }

    await page.waitForSelector('[aria-label="Return to Planetary Orbit"]', { timeout: 6000 });
    await page.waitForTimeout(1000);

    console.log("In Himalayan terrain view. Now triggering Ascend to Orbit...");
    const returnBtn = page.locator('[aria-label="Return to Planetary Orbit"]');
    await returnBtn.click();

    // Capture 20 frames spaced 100ms apart across the 2 second ascent
    for (let i = 0; i < 20; i++) {
      const framePath = path.join(framesDir, `ascent_frame_${String(i).padStart(2, "0")}.png`);
      await page.screenshot({ path: framePath });

      const state = await page.evaluate(() => {
        const earthCanvas = document.querySelector("canvas");
        const maplibreCanvas = document.querySelector(".maplibregl-canvas");
        return {
          hasEarth: !!earthCanvas,
          hasMaplibre: !!maplibreCanvas,
          viewState: (window).__LIVING_EARTH_STATE?.viewState,
        };
      });

      console.log(`Ascent Frame ${i}: t=${i * 100}ms | viewState=${state.viewState} | Earth=${state.hasEarth} | MapLibre=${state.hasMaplibre}`);
      await page.waitForTimeout(100);
    }

    console.log("Ascent recording complete.");
  } catch (err) {
    console.error("Ascent recording error:", err);
  } finally {
    await browser.close();
  }
}

recordAscentFrames();

