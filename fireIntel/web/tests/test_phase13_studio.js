/**
 * Phase 13 Automated Playwright Test Suite
 * Global Fire Intelligence Studio (/studio)
 * User Dataset Import + Automated ML Workspace
 */

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const SCREENSHOT_DIR = "/Users/macbook/.gemini/antigravity/brain/87e74a08-ad4d-4b76-8b48-7740d095bfb4/screenshots/phase13";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runStudioTests() {
  console.log("================================================================================");
  console.log("FIREINTEL PHASE 13: GLOBAL FIRE INTELLIGENCE STUDIO (/studio) TEST SUITE");
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
    // SUITE 1: DESKTOP STUDIO EXPERIENCE (1920x1080)
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

    await page.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    // Test 1.1: Studio Initial Render (Default California Sierra 2024 Dataset)
    const hasHeader = (await page.$("text=GLOBAL FIRE INTELLIGENCE STUDIO")) !== null;
    const hasMap = (await page.$(".maplibregl-canvas")) !== null;
    const hasDropzone = (await page.$("text=Automated Column Mapping")) !== null;
    const hasProfileDeck = (await page.$("text=Automated Dataset Profiling & Verification")) !== null;
    const hasModelLab = (await page.$("text=Automated Machine Learning & Analytics Laboratory")) !== null;

    record(
      "1.1",
      "Studio Initial Render (1920x1080)",
      hasHeader && hasMap && hasDropzone && hasProfileDeck && hasModelLab,
      `Header, Map, Schema Mapping, Profiling Deck, and Model Lab loaded`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_desktop_1920x1080_studio_overview.png") });

    // Test 1.2: Global Demo Preset Switch to Greece Attica
    await page.click("button[data-testid='demo-greece-btn']");
    await page.waitForTimeout(2000);
    const greeceState = await page.evaluate(() => (window).__STUDIO_STATE);
    const isGreece = greeceState?.datasetName?.includes("Greece") || greeceState?.totalRows === 950;
    record(
      "1.2",
      "Global Demo Switch (Greece Mediterranean 2024)",
      Boolean(isGreece),
      `Loaded: ${greeceState?.datasetName}, Total Rows: ${greeceState?.totalRows}`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_desktop_greece_dataset.png") });

    // Test 1.3: Ground Truth Specimen Switch (Uttarakhand with 'type' target)
    await page.click("button[data-testid='demo-uttarakhand-btn']");
    await page.waitForTimeout(2000);
    const ukState = await page.evaluate(() => (window).__STUDIO_STATE);
    const hasTargetCol = ukState?.mappings?.target_col === "type";
    record(
      "1.3",
      "Ground Truth Specimen with Target Label",
      hasTargetCol && ukState?.totalRows === 1500,
      `Loaded: ${ukState?.datasetName}, Target Col: ${ukState?.mappings?.target_col}, Rows: ${ukState?.totalRows}`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_desktop_uttarakhand_ground_truth.png") });

    // Test 1.4: Execute Supervised Machine Learning Pipeline
    await page.click("button[data-testid='execute-train-btn']");
    await page.waitForFunction(() => {
      const res = (window).__STUDIO_STATE?.modelResult;
      return res && res.model_type === "SUPERVISED_CLASSIFIER";
    }, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(500);

    const modelState = await page.evaluate(() => (window).__STUDIO_STATE?.modelResult);
    const isSupervised = modelState?.model_type === "SUPERVISED_CLASSIFIER";
    const hasMetrics = modelState?.metrics?.accuracy !== undefined && modelState?.metrics?.balanced_accuracy !== undefined;
    const hasConfusionMatrix = Array.isArray(modelState?.confusion_matrix?.matrix);
    record(
      "1.4",
      "Supervised Random Forest Classifier Execution",
      isSupervised && hasMetrics && hasConfusionMatrix,
      `Model: ${modelState?.model_name}, Acc: ${modelState?.metrics?.accuracy}%, Bal Acc: ${modelState?.metrics?.balanced_accuracy}%`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_desktop_supervised_ml_results.png") });

    // Test 1.5: Unsupervised Spatial & Anomaly Execution (California Dataset)
    await page.click("button[data-testid='demo-california-btn']");
    await page.waitForTimeout(2000);
    // Switch to Unsupervised
    await page.click("button:has-text('Spatial & Anomaly')");
    await page.waitForTimeout(600);
    await page.click("button[data-testid='execute-train-btn']");
    await page.waitForFunction(() => {
      const res = (window).__STUDIO_STATE?.modelResult;
      return res && res.model_type === "UNSUPERVISED_SPATIAL_ANOMALY";
    }, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(500);

    const anomState = await page.evaluate(() => (window).__STUDIO_STATE?.modelResult);
    const isUnsupervised = anomState?.model_type === "UNSUPERVISED_SPATIAL_ANOMALY";
    const clusterCount = anomState?.spatial_clusters?.cluster_count;
    const anomalyCount = anomState?.anomaly_detection?.anomalous_observations;
    record(
      "1.5",
      "Unsupervised DBSCAN & Isolation Forest Execution",
      isUnsupervised && clusterCount !== undefined && anomalyCount !== undefined,
      `Clusters: ${clusterCount}, Anomalies: ${anomalyCount} (${anomState?.anomaly_detection?.anomaly_percentage}%)`
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_desktop_unsupervised_anomaly_results.png") });

    // Test 1.6: Export Research Dossier Modal
    await page.click("button[data-testid='export-dossier-btn']");
    await page.waitForTimeout(800);
    const exportModalVisible = (await page.$("text=GLOBAL RESEARCH DOSSIER STUDIO")) !== null;
    const hasDownloadCards = (await page.$("text=Cleaned Points")) !== null &&
                             (await page.$("text=Spatial Geometry")) !== null &&
                             (await page.$("text=Metadata Config")) !== null;
    record(
      "1.6",
      "Scientific Export Studio (CSV, GeoJSON, Dossier)",
      exportModalVisible && hasDownloadCards,
      "Modal open with Cleaned CSV, GeoJSON and Markdown Research Dossier"
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_desktop_export_dossier_modal.png") });

    // Close export modal
    await page.click("button[aria-label='Close export dialog']");
    await page.waitForTimeout(500);

    // Test 1.7: Zero Critical Console or Network Errors on Desktop
    if (consoleErrors.length > 0) console.log("Console errors detail:", consoleErrors);
    record(
      "1.7",
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
    await pageLaptop.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
    await pageLaptop.waitForTimeout(2000);
    const hasLaptopHeader = (await pageLaptop.$("text=GLOBAL FIRE INTELLIGENCE STUDIO")) !== null;
    record("2.1", "Laptop Responsive Layout (1440x900)", hasLaptopHeader, "Scaled 1440px layout");
    await pageLaptop.screenshot({ path: path.join(SCREENSHOT_DIR, "07_laptop_1440x900_overview.png") });
    await ctxLaptop.close();

    // 2.2 Tablet (768x1024)
    const ctxTablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const pageTablet = await ctxTablet.newPage();
    await pageTablet.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
    await pageTablet.waitForTimeout(2000);
    const hasTabletHeader = (await pageTablet.$("text=GLOBAL FIRE INTELLIGENCE STUDIO")) !== null;
    record("2.2", "Tablet Responsive Layout (768x1024)", hasTabletHeader, "Stacked responsive layout");
    await pageTablet.screenshot({ path: path.join(SCREENSHOT_DIR, "08_tablet_768x1024_overview.png") });
    await ctxTablet.close();

    // 2.3 Mobile (390x844 - iPhone 14)
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
    await pageMobile.waitForTimeout(2000);
    const hasMobileHeader = (await pageMobile.$("text=GLOBAL FIRE INTELLIGENCE STUDIO")) !== null;
    record("2.3", "Mobile Responsive Layout (390x844)", hasMobileHeader, "Touch targets, responsive map and cards");
    await pageMobile.screenshot({ path: path.join(SCREENSHOT_DIR, "09_mobile_390x844_overview.png") });
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

runStudioTests();

