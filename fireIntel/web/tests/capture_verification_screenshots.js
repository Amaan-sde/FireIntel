const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const outDir = path.resolve('/Users/macbook/.gemini/antigravity/brain/87e74a08-ad4d-4b76-8b48-7740d095bfb4/screenshots/phase8_5');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('Capturing /terrain...');
  await page.goto('http://localhost:3000/terrain', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'terrain_fixed_1920x1080.png'), fullPage: false });

  console.log('Capturing /methodology...');
  await page.goto('http://localhost:3000/methodology', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'methodology_fixed_1920x1080.png'), fullPage: false });

  console.log('Capturing /data...');
  await page.goto('http://localhost:3000/data', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'data_fixed_1920x1080.png'), fullPage: false });

  // Mobile /data
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'data_mobile_390x844.png'), fullPage: false });

  await browser.close();
  console.log('Screenshots saved successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
