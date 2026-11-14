const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

async function runPhase8Validation() {
  console.log("==========================================================================");
  console.log("PHASE 8: DATA EXPLORER & EXPORT PLATFORM VALIDATION SUITE");
  console.log("==========================================================================");

  const screenshotDir = "/Users/macbook/.gemini/antigravity/brain/87e74a08-ad4d-4b76-8b48-7740d095bfb4/screenshots/phase8_data";
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const downloadsDir = path.join(screenshotDir, "downloads");
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const auditResults = [];

  function record(id, title, passed, details = "") {
    const symbol = passed ? "✓ PASSED" : "✗ FAILED";
    console.log(`[${symbol}] [${id}] ${title}: ${details}`);
    auditResults.push({ id, title, passed, details });
  }

  const consoleErrors = [];
  const failedRequests = [];

  function attachListeners(page) {
    page.on("console", (msg) => {
      const locUrl = msg.location()?.url || "";
      if (msg.type() === "error" && !msg.text().includes("favicon.ico") && !locUrl.includes("favicon.ico")) {
        consoleErrors.push({ url: page.url(), text: msg.text() });
      }
    });
    page.on("response", (resp) => {
      if (resp.status() >= 400 && !resp.url().includes("favicon.ico")) {
        failedRequests.push({ url: resp.url(), status: resp.status() });
      }
    });
  }

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    attachListeners(page);

    // =========================================================================
    // SECTION 1: ROUTE LOAD & INITIAL TELEMETRY SUMMARY
    // =========================================================================
    console.log("\n--- SECTION 1: Route Load & Initial Summary Verification ---");
    await page.goto("http://localhost:3000/data", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const titleText = await page.locator("h1").innerText();
    record("1.1", "Data Explorer Route Loads", titleText.includes("NASA FIRMS Observation Explorer"), titleText);

    // Verify Summary counts match empirical 2025 baseline
    const totalMatchingText = await page.locator("section[aria-label='Filtered Data Summary']").locator("div.text-3xl").first().innerText();
    const cleanTotal = parseInt(totalMatchingText.replace(/,/g, ""), 10);
    record("1.2", "Initial Total Observation Count (7,541 Baseline)", cleanTotal === 7541, `Reported: ${totalMatchingText}`);

    // Verify Table rendered 25 initial rows
    await page.waitForSelector("tr.observation-row", { timeout: 10000 });
    const initialRows = await page.locator("tr.observation-row").count();
    record("1.3", "Initial Table Rows Rendered (Page Size 25)", initialRows === 25, `Rendered rows: ${initialRows}`);

    await page.screenshot({ path: path.join(screenshotDir, "sec1_data_explorer_initial_1440x900.png") });

    // =========================================================================
    // SECTION 2: LIVE REACTIVE FILTERING & SENSOR DECOUPLING
    // =========================================================================
    console.log("\n--- SECTION 2: Live Reactive Filtering & Decoupled Semantics ---");

    // 2A: Filter by Sensor = MODIS (918 records)
    const sensorSelect = page.locator("select").nth(0);
    await sensorSelect.selectOption("MODIS");
    await page.waitForTimeout(1000);

    const modisMatchingText = await page.locator("section[aria-label='Filtered Data Summary']").locator("div.text-3xl").first().innerText();
    const cleanModis = parseInt(modisMatchingText.replace(/,/g, ""), 10);
    record("2.1", "Sensor Filter: MODIS Isolates 918 Records", cleanModis === 918, `Count: ${cleanModis}`);

    // Check table rows are all MODIS
    await page.waitForSelector("tr.observation-row[data-sensor='MODIS']", { timeout: 10000 });
    const firstRowSensor = await page.locator("tr.observation-row").first().locator("span.uppercase").first().innerText();
    record("2.2", "Table Reflects Sensor Filter", firstRowSensor === "MODIS", `First row sensor: ${firstRowSensor}`);

    // 2B: Filter by Sensor = VIIRS (6,623 records)
    await sensorSelect.selectOption("VIIRS");
    await page.waitForTimeout(800);

    const viirsMatchingText = await page.locator("section[aria-label='Filtered Data Summary']").locator("div.text-3xl").first().innerText();
    const cleanViirs = parseInt(viirsMatchingText.replace(/,/g, ""), 10);
    record("2.3", "Sensor Filter: VIIRS Isolates 6,623 Records", cleanViirs === 6623, `Count: ${cleanViirs}`);

    // 2C: Decoupled VIIRS High Confidence Filter (90 records)
    // Uncheck Low and Nominal
    const lowCheckbox = page.locator("input[type='checkbox']").nth(0);
    const nominalCheckbox = page.locator("input[type='checkbox']").nth(1);
    await lowCheckbox.uncheck();
    await nominalCheckbox.uncheck();
    await page.waitForTimeout(800);

    const viirsHighText = await page.locator("section[aria-label='Filtered Data Summary']").locator("div.text-3xl").first().innerText();
    const cleanViirsHigh = parseInt(viirsHighText.replace(/,/g, ""), 10);
    record("2.4", "Decoupled VIIRS High Confidence Categorical Filter (90 Records)", cleanViirsHigh === 90, `Count: ${cleanViirsHigh}`);

    // 2D: Reset Filters
    const resetBtn = page.locator("button:has-text('Reset Filters')");
    await resetBtn.click();
    await page.waitForTimeout(800);

    const resetTotalText = await page.locator("section[aria-label='Filtered Data Summary']").locator("div.text-3xl").first().innerText();
    record("2.5", "Reset Filters Restores Full 7,541 Baseline", parseInt(resetTotalText.replace(/,/g, ""), 10) === 7541, `Total: ${resetTotalText}`);

    // 2E: Pre-Monsoon Peak Date Preset (Apr-May)
    const preMonsoonBtn = page.locator("button:has-text('Pre-Monsoon Peak (Apr–May)')");
    await preMonsoonBtn.click();
    await page.waitForTimeout(800);

    const preMonsoonCountText = await page.locator("section[aria-label='Filtered Data Summary']").locator("div.text-3xl").first().innerText();
    const cleanPreMonsoon = parseInt(preMonsoonCountText.replace(/,/g, ""), 10);
    record("2.6", "Pre-Monsoon Date Preset Filters Active Season", cleanPreMonsoon > 2000 && cleanPreMonsoon < 7541, `Pre-monsoon count: ${cleanPreMonsoon}`);

    await page.screenshot({ path: path.join(screenshotDir, "sec2_filtered_premonsoon_season.png") });

    // Reset back for table & download testing
    await resetBtn.click();
    await page.waitForTimeout(800);

    // =========================================================================
    // SECTION 3: TABLE SORTING & PAGINATION
    // =========================================================================
    console.log("\n--- SECTION 3: Table Sorting & Server Pagination ---");

    // 3A: Sort by FRP descending
    const frpHeader = page.locator("th:has-text('FRP (MW)')");
    await frpHeader.click();
    await page.waitForTimeout(800);

    const topFrpCell = await page.locator("tbody tr").first().locator("td").nth(3).innerText();
    record("3.1", "Table Sort by FRP Descending (Peak 169.90 MW)", topFrpCell.includes("169.90") || topFrpCell.includes("169.9"), `Peak FRP cell: ${topFrpCell}`);

    // 3B: Next Page Pagination
    const nextBtn = page.locator("button[title='Next Page']");
    await nextBtn.click();
    await page.waitForTimeout(800);

    const pageNumIndicator = await page.locator("span.current-page-num").innerText();
    record("3.2", "Pagination: Next Page Advances to Page 2", pageNumIndicator === "2", `Current page indicator: ${pageNumIndicator}`);

    // =========================================================================
    // SECTION 4: ACTUAL FILE EXPORT VALIDATION (CSV, JSON, GEOJSON)
    // =========================================================================
    console.log("\n--- SECTION 4: Actual File Export & Provenance Verification ---");

    // 4A: CSV Export Trigger & Verification
    const csvExportBtn = page.locator("button:has-text('Export CSV Dataset')");
    const [csvDownload] = await Promise.all([
      page.waitForEvent("download"),
      csvExportBtn.click(),
    ]);

    const csvPath = path.join(downloadsDir, "downloaded_telemetry.csv");
    await csvDownload.saveAs(csvPath);
    const csvContent = fs.readFileSync(csvPath, "utf-8");

    const hasCsvHeaders = csvContent.includes("obs_id,latitude,longitude,acq_date,acq_time");
    const hasMetadataComment = csvContent.includes("# FIREINTEL // NASA EARTH OBSERVATION DATA EXPLORER EXPORT");
    const csvLineCount = csvContent.split("\n").filter(Boolean).length;
    record("4.1", "Actual CSV Export Verified", hasCsvHeaders && hasMetadataComment && csvLineCount > 7000, `Lines: ${csvLineCount}, Has NASA Metadata: ${hasMetadataComment}`);

    // 4B: JSON Export Trigger & Verification
    const jsonExportBtn = page.locator("button:has-text('Export JSON Package')");
    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      jsonExportBtn.click(),
    ]);

    const jsonPath = path.join(downloadsDir, "downloaded_telemetry.json");
    await jsonDownload.saveAs(jsonPath);
    const jsonParsed = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    const hasJsonMeta = jsonParsed.metadata && jsonParsed.metadata.study_region === "Uttarakhand, India";
    const jsonRecordCount = jsonParsed.records ? jsonParsed.records.length : 0;
    record("4.2", "Actual JSON Package Verified", hasJsonMeta && jsonRecordCount === 7541, `Records: ${jsonRecordCount}, Region: ${jsonParsed.metadata?.study_region}`);

    // 4C: GeoJSON Export Trigger & Verification
    const geojsonExportBtn = page.locator("button:has-text('Export GeoJSON Layer')");
    const [geojsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      geojsonExportBtn.click(),
    ]);

    const geojsonPath = path.join(downloadsDir, "downloaded_telemetry.geojson");
    await geojsonDownload.saveAs(geojsonPath);
    const geojsonParsed = JSON.parse(fs.readFileSync(geojsonPath, "utf-8"));

    const isFeatureCollection = geojsonParsed.type === "FeatureCollection";
    const geojsonFeatureCount = geojsonParsed.features ? geojsonParsed.features.length : 0;
    const firstCoords = geojsonParsed.features[0].geometry.coordinates; // [lon, lat]
    const isCoordinateOrderValid = firstCoords[0] > 77 && firstCoords[0] < 82 && firstCoords[1] > 28 && firstCoords[1] < 32;

    record("4.3", "Actual GeoJSON Layer Verified (RFC 7946 [lon, lat])", isFeatureCollection && geojsonFeatureCount === 7541 && isCoordinateOrderValid, `Features: ${geojsonFeatureCount}, Coords[0]: [${firstCoords.join(", ")}]`);

    // =========================================================================
    // SECTION 5: RESPONSIVE VIEWPORT TESTING (5 SIZES)
    // =========================================================================
    console.log("\n--- SECTION 5: Multi-Viewport Responsive Validation ---");
    const testViewports = [
      { name: "1920x1080_desktop", width: 1920, height: 1080 },
      { name: "1440x900_laptop", width: 1440, height: 900 },
      { name: "768x1024_tablet", width: 768, height: 1024 },
      { name: "390x844_mobile", width: 390, height: 844 },
      { name: "375x812_compact", width: 375, height: 812 },
    ];

    for (const vp of testViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);

      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });

      const isContained = overflow.scrollWidth <= overflow.innerWidth + 2;
      record(`5.1.${vp.name}`, `Responsive Containment (${vp.name})`, isContained, `${overflow.scrollWidth}px vs ${overflow.innerWidth}px`);
      await page.screenshot({ path: path.join(screenshotDir, `resp_${vp.name}_data_explorer.png`) });
    }

    // =========================================================================
    // SECTION 6: CONSOLE ERROR & NETWORK CLEANLINESS
    // =========================================================================
    console.log("\n--- SECTION 6: Console Error & Network Audit ---");
    const noConsoleErrors = consoleErrors.length === 0;
    record("6.1", "Browser Console Error Cleanliness", noConsoleErrors, `Found ${consoleErrors.length} console errors`);

    const noFailedRequests = failedRequests.length === 0;
    record("6.2", "Network Asset Delivery (200 OK)", noFailedRequests, `Found ${failedRequests.length} non-200 responses`);

    await context.close();
  } catch (err) {
    console.error("Test suite execution error:", err);
    record("0.0", "Phase 8 Suite Execution", false, err.message);
  } finally {
    await browser.close();
  }

  console.log("\n==========================================================================");
  console.log("PHASE 8 VALIDATION COMPLETE");
  const passedCount = auditResults.filter((r) => r.passed).length;
  console.log(`PASSED: ${passedCount} / ${auditResults.length} (${((passedCount / auditResults.length) * 100).toFixed(1)}%)`);
}

runPhase8Validation();
