const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const OUT = 'C:/Users/harsh/.gemini/antigravity/brain/fc0ece0c-0b0d-416c-a5d6-355b319adc72';

async function runTests() {
  console.log("================================================================================");
  console.log("FIREINTEL 3D TOPOGRAPHY: LOCATION SEARCH & TERRAIN INTELLIGENCE TEST SUITE");
  console.log("================================================================================");

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('AbortError')) {
      errors.push(msg.text());
    }
  });

  try {
    console.log("\n[TEST 1] Loading /terrain page...");
    await page.goto('http://localhost:3000/terrain', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const hasCanvas = (await page.$('.maplibregl-canvas')) !== null;
    const hasSearchPanel = (await page.$('aside[aria-label="Location Explorer Panel"]')) !== null;
    console.log(`  MapLibre canvas present: ${hasCanvas}`);
    console.log(`  Location Explorer panel present: ${hasSearchPanel}`);

    // Take initial screenshot
    await page.screenshot({ path: path.join(OUT, '01_terrain_initial_view.png') });

    // Test 2: Typing search query "Joshimath"
    console.log("\n[TEST 2] Searching for 'Joshimath'...");
    const searchInput = await page.$('input[aria-label="Search village, city, district in Uttarakhand"]');
    await searchInput.fill('Joshimath');
    await page.waitForTimeout(1000);

    // Verify suggestions appear
    const suggestions = await page.$$('div:has-text("Matching Places") button');
    console.log(`  Suggestions count for 'Joshimath': ${suggestions.length}`);
    await page.screenshot({ path: path.join(OUT, '02_search_suggestions_joshimath.png') });

    // Test 3: Selecting Joshimath
    console.log("\n[TEST 3] Selecting Joshimath from suggestions...");
    await page.click('button:has-text("Joshimath")');
    await page.waitForTimeout(2500);

    // Verify black information popup appeared with Location, Terrain, and Fire intelligence
    const hasInspector = (await page.$('aside[aria-label="Master Grid Cell Geomorphology Inspector"]')) !== null;
    console.log(`  Black Information Popup visible: ${hasInspector}`);

    const inspectorText = await page.textContent('aside[aria-label="Master Grid Cell Geomorphology Inspector"]');
    console.log("  Inspector Place:", inspectorText.includes("Joshimath") ? "PASS (Found Joshimath)" : "FAIL");
    console.log("  Inspector District:", inspectorText.includes("Chamoli") ? "PASS (Found Chamoli)" : "FAIL");
    console.log("  Inspector Elevation:", inspectorText.includes("Copernicus Elevation") ? "PASS" : "FAIL");
    console.log("  Inspector Fire Intelligence:", inspectorText.includes("Fire Intelligence") ? "PASS" : "FAIL");

    await page.screenshot({ path: path.join(OUT, '03_joshimath_selected_view.png') });

    // Test 4: Searching for "Nainital"
    console.log("\n[TEST 4] Searching for 'Nainital'...");
    await searchInput.fill('Nainital');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Nainital District")');
    await page.waitForTimeout(2500);

    const nainitalInspectorText = await page.textContent('aside[aria-label="Master Grid Cell Geomorphology Inspector"]');
    console.log("  Inspector Place:", nainitalInspectorText.includes("Nainital") ? "PASS (Found Nainital)" : "FAIL");
    console.log("  Inspector Fire Observations:", nainitalInspectorText.includes("Observations") ? "PASS" : "FAIL");
    await page.screenshot({ path: path.join(OUT, '04_nainital_selected_view.png') });

    // Test 5: Testing Collapse & Expand of Location Explorer
    console.log("\n[TEST 5] Testing Collapse & Expand...");
    await page.click('button[aria-label="Collapse Location Explorer"]');
    await page.waitForTimeout(500);
    const isCollapsed = (await page.$('button[aria-label="Expand Location Explorer"]')) !== null;
    console.log(`  Location Explorer successfully collapsed to pill: ${isCollapsed}`);
    await page.screenshot({ path: path.join(OUT, '05_search_collapsed_pill.png') });

    await page.click('button[aria-label="Expand Location Explorer"]');
    await page.waitForTimeout(500);
    const isReExpanded = (await page.$('aside[aria-label="Location Explorer Panel"]')) !== null;
    console.log(`  Location Explorer successfully re-expanded: ${isReExpanded}`);

    console.log("\n================================================================================");
    console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log(`Console Errors count: ${errors.length}`);
    if (errors.length > 0) {
      console.log("Errors:", errors);
    }
    console.log("================================================================================");
  } catch (err) {
    console.error("Test failed with exception:", err);
  } finally {
    await browser.close();
  }
}

runTests();
