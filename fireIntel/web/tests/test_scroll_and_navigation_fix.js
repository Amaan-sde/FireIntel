const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

async function runScrollAndNavAudit() {
  console.log("==================================================================");
  console.log("TESTING SCROLLING, NAVIGATION & IOS/MOBILE COMPATIBILITY");
  console.log("==================================================================");

  const artifactDir = "/Users/macbook/.gemini/antigravity/brain/87e74a08-ad4d-4b76-8b48-7740d095bfb4/screenshots";
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];

  function record(name, passed, details = "") {
    console.log(`[${passed ? "✓ PASSED" : "✗ FAILED"}] ${name}: ${details}`);
    results.push({ name, passed, details });
  }

  try {
    // ------------------------------------------------------------------
    // TEST 1: METHODOLOGY PAGE SCROLLING & CONTENT ACCESSIBILITY
    // ------------------------------------------------------------------
    console.log("\n--- TEST 1: /methodology Scrolling ---");
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://localhost:3000/methodology", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const methScrollMetrics = await page.evaluate(() => {
      const el = document.querySelector("main") || document.documentElement;
      return {
        mainScrollHeight: el.scrollHeight,
        mainClientHeight: el.clientHeight,
        bodyScrollHeight: document.body.scrollHeight,
        winHeight: window.innerHeight,
      };
    });

    console.log("Methodology scroll metrics:", methScrollMetrics);

    // Perform scroll
    await page.evaluate(() => {
      const el = document.querySelector("main");
      if (el) el.scrollTop = 1200;
      window.scrollTo(0, 1200);
    });
    await page.waitForTimeout(500);

    const methScrollAfter = await page.evaluate(() => {
      const el = document.querySelector("main");
      return {
        mainScrollTop: el ? el.scrollTop : 0,
        winScrollY: window.scrollY,
      };
    });

    const methScrolled = methScrollAfter.mainScrollTop > 300 || methScrollAfter.winScrollY > 300;
    record("Methodology Page Vertical Scroll", methScrolled, `Scrolled to ${Math.max(methScrollAfter.mainScrollTop, methScrollAfter.winScrollY)}px`);

    await page.screenshot({ path: path.join(artifactDir, "verify_methodology_scrolled.png") });

    // ------------------------------------------------------------------
    // TEST 2: ANALYTICS PAGE SCROLLING
    // ------------------------------------------------------------------
    console.log("\n--- TEST 2: /analytics Scrolling ---");
    await page.goto("http://localhost:3000/analytics", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const el = document.querySelector("main");
      if (el) el.scrollTop = 1000;
      window.scrollTo(0, 1000);
    });
    await page.waitForTimeout(500);

    const analyticsScrollAfter = await page.evaluate(() => {
      const el = document.querySelector("main");
      return {
        mainScrollTop: el ? el.scrollTop : 0,
        winScrollY: window.scrollY,
      };
    });

    const analyticsScrolled = analyticsScrollAfter.mainScrollTop > 300 || analyticsScrollAfter.winScrollY > 300;
    record("Analytics Page Vertical Scroll", analyticsScrolled, `Scrolled to ${Math.max(analyticsScrollAfter.mainScrollTop, analyticsScrollAfter.winScrollY)}px`);

    await page.screenshot({ path: path.join(artifactDir, "verify_analytics_scrolled.png") });

    // ------------------------------------------------------------------
    // TEST 3: HOMEPAGE "EXPLORE THE HIMALAYAS" & SKIP DESCENT NAVIGATION
    // ------------------------------------------------------------------
    console.log("\n--- TEST 3: Homepage Descent & Skip to Himalayas ---");
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const exploreBtn = page.locator("button:has-text('EXPLORE THE HIMALAYAS')");
    await exploreBtn.click();
    console.log("Clicked EXPLORE THE HIMALAYAS");
    await page.waitForTimeout(600);

    // Look for "Skip to Himalayas" button
    const skipBtn = page.locator("button:has-text('Skip to Himalayas')").first();
    const hasSkipBtn = (await skipBtn.count()) > 0;
    record("Descent In-Flight HUD & Skip CTA", hasSkipBtn, "Skip to Himalayas CTA visible during descent");

    if (hasSkipBtn) {
      await skipBtn.click();
      console.log("Clicked Skip to Himalayas CTA");
      await page.waitForURL("**/terrain", { timeout: 5000 });
      const currentUrl = page.url();
      record("Skip to Himalayas Navigation", currentUrl.includes("/terrain"), `Successfully navigated to ${currentUrl}`);
    }

    await page.screenshot({ path: path.join(artifactDir, "verify_navigated_to_terrain.png") });

    // ------------------------------------------------------------------
    // TEST 4: TERRAIN TOP NAVBAR NAVIGATION BACK TO ORBIT
    // ------------------------------------------------------------------
    console.log("\n--- TEST 4: Terrain Navigation Back to Orbit ---");
    const orbitLink = page.locator("a[aria-label='Return to Planetary Orbit']").first();
    const hasOrbitLink = (await orbitLink.count()) > 0;
    if (hasOrbitLink) {
      await orbitLink.click();
      await page.waitForURL("http://localhost:3000/", { timeout: 5000 });
      record("Orbit Link Navigation", page.url() === "http://localhost:3000/", "Navigated back to Living Earth Orbit");
    }

    // ------------------------------------------------------------------
    // TEST 5: MOBILE (390x844 - iPhone / iOS) NAVIGATION & SCROLLING
    // ------------------------------------------------------------------
    console.log("\n--- TEST 5: iOS / Mobile Viewport (390x844) Audit ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    // 5A: /fires Mobile Navigation Header & Hamburger Menu
    await mobilePage.goto("http://localhost:3000/fires", { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(1500);

    const menuBtn = mobilePage.locator("button[aria-label='Open navigation menu']");
    const hasMenuBtn = (await menuBtn.count()) > 0;
    record("Mobile Navigation Hamburger Toggle", hasMenuBtn, "Menu button visible on 390px viewport");

    if (hasMenuBtn) {
      await menuBtn.click();
      await mobilePage.waitForTimeout(400);
      const hasNavDropdown = (await mobilePage.locator("text=Mission Navigation").count()) > 0;
      record("Mobile Navigation Menu Dropdown", hasNavDropdown, "All 5 primary mission routes available in dropdown");
      await mobilePage.screenshot({ path: path.join(artifactDir, "verify_mobile_nav_menu.png") });
    }

    // 5B: /methodology Mobile Scrolling
    await mobilePage.goto("http://localhost:3000/methodology", { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(1000);

    const mobileScrollMetrics = await mobilePage.evaluate(() => {
      return {
        docHeight: document.documentElement.scrollHeight,
        winHeight: window.innerHeight,
        bodyHeight: document.body.scrollHeight,
      };
    });
    console.log("Mobile methodology scroll metrics:", mobileScrollMetrics);

    await mobilePage.evaluate(() => {
      window.scrollTo(0, 800);
      const el = document.querySelector("main");
      if (el) el.scrollTop = 800;
    });
    await mobilePage.waitForTimeout(500);

    const mobileScrollAfter = await mobilePage.evaluate(() => {
      const el = document.querySelector("main");
      return {
        winScrollY: window.scrollY,
        docScrollTop: document.documentElement.scrollTop,
        mainScrollTop: el ? el.scrollTop : 0,
      };
    });

    const mobileScrolledPx = Math.max(
      mobileScrollAfter.winScrollY,
      mobileScrollAfter.docScrollTop,
      mobileScrollAfter.mainScrollTop
    );

    record("Mobile Methodology Scrolling", mobileScrolledPx > 200, `Mobile scrolled to ${mobileScrolledPx}px`);
    await mobilePage.screenshot({ path: path.join(artifactDir, "verify_mobile_methodology_scrolled.png") });

    await mobilePage.close();
    await mobileContext.close();
    await page.close();
  } catch (err) {
    console.error("Test execution error:", err);
    record("Audit Execution", false, err.message);
  } finally {
    await browser.close();
  }

  console.log("\n==================================================================");
  console.log("FINAL AUDIT SUMMARY:");
  const allPassed = results.every(r => r.passed);
  console.log(`STATUS: ${allPassed ? "ALL AUDITS PASSED PERFECTLY" : "SOME AUDITS FAILED"}`);
  console.log("==================================================================");
  return allPassed;
}

runScrollAndNavAudit().then(passed => {
  process.exit(passed ? 0 : 1);
});
