const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

async function recordTransitionFrames() {
  console.log("==================================================================");
  console.log("RECORDING FRAME-BY-FRAME DESCENT TO DETECT BLACK FRAMES");
  console.log("==================================================================");

  const framesDir = path.join(__dirname, "transition_frames");
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
    await page.waitForTimeout(2000);

    console.log("Triggering descent...");
    const exploreBtn = page.locator('button:has-text("EXPLORE THE HIMALAYAS")');
    await exploreBtn.click();

    // Capture 30 frames spaced 150ms apart across the 4.5 second descent & handoff
    const frameAnalysis = [];
    for (let i = 0; i < 30; i++) {
      const framePath = path.join(framesDir, `frame_${String(i).padStart(2, "0")}.png`);
      await page.screenshot({ path: framePath });

      // Analyze page DOM state at this exact moment
      const state = await page.evaluate(() => {
        const earthCanvas = document.querySelector("canvas");
        const maplibreCanvas = document.querySelector(".maplibregl-canvas");
        const hud = document.querySelector("h1, h2");
        return {
          hasEarth: !!earthCanvas,
          hasMaplibre: !!maplibreCanvas,
          title: hud ? hud.textContent : "",
          isDescending: (window).__LIVING_EARTH_STATE?.isDescending,
          viewState: (window).__LIVING_EARTH_STATE?.viewState,
          stage: (window).__LIVING_EARTH_STATE?.descentStage,
        };
      });

      console.log(`Frame ${i}: t=${i * 150}ms | viewState=${state.viewState} | stage=${state.stage} | Earth=${state.hasEarth} | MapLibre=${state.hasMaplibre}`);
      frameAnalysis.push({ frame: i, timeMs: i * 150, state });
      await page.waitForTimeout(150);
    }

    console.log("Transition recording complete. Analyzing frames...");
  } catch (err) {
    console.error("Recording error:", err);
  } finally {
    await browser.close();
  }
}

recordTransitionFrames();

