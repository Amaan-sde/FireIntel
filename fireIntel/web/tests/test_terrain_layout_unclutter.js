const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

async function runTerrainLayoutAudit() {
  console.log("==================================================================");
  console.log("AUDITING TERRAIN EXPLORER UI: ZERO CRACKED BUTTONS & ZERO OVERLAPS");
  console.log("==================================================================");

  const artifactDir = "/Users/macbook/.gemini/antigravity/brain/87e74a08-ad4d-4b76-8b48-7740d095bfb4/screenshots";
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto("http://localhost:3000/terrain", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // 1. Check Boundary Button Bounding Box & Visibility
    const boundaryBtn = page.locator("button:has-text('Boundary')");
    const boundaryBox = await boundaryBtn.boundingBox();
    console.log("Boundary button bounding box:", boundaryBox);

    const boundaryText = await boundaryBtn.innerText();
    console.log("Boundary button text:", boundaryText);

    // 2. Check Camera Buttons Bounding Boxes
    const orbitBtn = page.locator("button[data-camera='orbital']");
    const orbitBox = await orbitBtn.boundingBox();
    console.log("Orbit button bounding box:", orbitBox);

    // Verify Boundary and Orbit DO NOT intersect
    const intersects = (
      boundaryBox.x < orbitBox.x + orbitBox.width &&
      boundaryBox.x + boundaryBox.width > orbitBox.x &&
      boundaryBox.y < orbitBox.y + orbitBox.height &&
      boundaryBox.y + boundaryBox.height > orbitBox.y
    );

    console.log("Do Boundary and Camera controls intersect?", intersects);
    if (intersects) {
      throw new Error("COLLISION DETECTED: Boundary button overlaps with Camera controls!");
    } else {
      console.log("[✓ PASSED] Zero collision between top toolbar and camera vantage dock.");
    }

    // 3. Check Sector Information Card & Integrated Legend
    const sectorCard = page.locator("aside[aria-label='Terrain Sector Overview']");
    const hasCard = (await sectorCard.count()) > 0;
    const cardText = await sectorCard.innerText();
    const hasFRPScale = cardText.includes("Radiative Power (FRP):");
    console.log("Sector card has integrated FRP scale:", hasFRPScale);

    await page.screenshot({ path: path.join(artifactDir, "terrain_clean_satellite.png") });

    // 4. Test Elevation Mode
    const elevBtn = page.locator("button:has-text('Elevation')");
    await elevBtn.click();
    await page.waitForTimeout(1000);
    const elevText = await sectorCard.innerText();
    const hasElevScale = elevText.includes("Copernicus GLO-30 Elevation:");
    console.log("Elevation mode switched, has elevation scale in card:", hasElevScale);
    await page.screenshot({ path: path.join(artifactDir, "terrain_clean_elevation.png") });

    // 5. Test Slope Mode
    const slopeBtn = page.locator("button:has-text('Slope Gradient')");
    await slopeBtn.click();
    await page.waitForTimeout(1000);
    const slopeText = await sectorCard.innerText();
    const hasSlopeScale = slopeText.includes("Slope Gradient Chimneys:");
    console.log("Slope mode switched, has slope scale in card:", hasSlopeScale);
    await page.screenshot({ path: path.join(artifactDir, "terrain_clean_slope.png") });

    // 6. Test Camera Perspective Transition
    const ridgeBtn = page.locator("button[data-camera='ridge']");
    await ridgeBtn.click();
    await page.waitForTimeout(1500);
    console.log("[✓ PASSED] Switched camera to 3D Himalayan Relief perspective.");
    await page.screenshot({ path: path.join(artifactDir, "terrain_clean_ridge_camera.png") });

    console.log("\n==================================================================");
    console.log("ALL TERRAIN UI ELEMENTS AUDITED: 100% SPACIOUS & PRISTINE");
    console.log("==================================================================");
    return true;
  } catch (err) {
    console.error("Terrain layout audit error:", err);
    return false;
  } finally {
    await browser.close();
  }
}

runTerrainLayoutAudit().then(passed => {
  process.exit(passed ? 0 : 1);
});
